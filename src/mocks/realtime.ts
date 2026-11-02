/*
 * Servidor Socket.IO simulado sobre o interceptador de WebSocket do MSW (ws.link + @mswjs/socket.io-binding).
 *
 * Limitações do transporte no ambiente de mocks:
 * - só o transporte `websocket` é interceptado; long-polling HTTP não funciona, então o cliente
 *   precisa de `transports: ['websocket']`;
 * - o binding não implementa rooms, namespaces nem acks: o roteamento por usuário é feito aqui,
 *   mantendo um registro de conexões e filtrando pelo dono do token;
 * - o handshake é respondido pelo próprio binding (sid fixo) antes de conhecermos o `auth`, por isso um
 *   token inválido não recusa a conexão: ela segue como visitante e só recebe eventos públicos;
 * - o binding não envia heartbeats, então o ping do Engine.IO é emitido aqui para o cliente não
 *   encerrar a conexão por "ping timeout";
 * - o socket.io-client guarda o construtor de WebSocket ao ser avaliado: ele precisa ser importado
 *   depois de `startMocks()` para que a conexão seja interceptada.
 */
import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws, type WebSocketHandlerConnection } from 'msw'
import { z } from 'zod'
import { env } from '@/shared/config/env'
import {
  REALTIME_CLIENT_EVENTS,
  REALTIME_EVENTS,
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
  type NftUpdatedEvent,
  type OrderUpdatedEvent,
} from '@/shared/contracts'
import { mulEth } from '@/shared/lib/money'
import { db } from './db/store'
import type { NftRecord, OrderRecord } from './db/schema'
import { nowIso } from './lib/text'
import { isOffline } from './network'
import { userIdForToken } from './services/auth'
import { currentPrice, isSoldOut } from './services/nft-view'

/** Mesmos valores anunciados pelo binding no pacote de abertura. */
const PING_INTERVAL_MS = 25_000
const SERVER_CLOSE_CODE = 4000

const handshakeAuthSchema = z.object({ token: z.string().nullish() }).partial()
const orderSubscriptionSchema = z.object({ orderId: z.string() })

interface ServerConnection {
  id: number
  token: string | null
  subscriptions: Set<string>
  emit(event: string, payload: unknown): void
  close(): void
}

const connections = new Set<ServerConnection>()
const lastNftEvent = new Map<string, NftUpdatedEvent>()
const previousNftEvent = new Map<string, NftUpdatedEvent>()
let connectionSeq = 0
let paused = false
let lateSeq = 0

function validated<T>(schema: z.ZodType<T>, event: T) {
  if (env.isDev) {
    const parsed = schema.safeParse(event)
    if (!parsed.success) console.error('[mocks] Evento fora do contrato', parsed.error.issues, event)
  }
  return event
}

function buildNftEvent(nft: NftRecord, version = nft.version, eventId = `evt_nft_${nft.id}_v${version}`): NftUpdatedEvent {
  return validated(nftUpdatedEventSchema, {
    eventId,
    type: REALTIME_EVENTS.nftUpdated,
    occurredAt: nowIso(),
    resource: { type: 'nft', id: nft.id, version },
    data: {
      nftId: nft.id,
      priceEth: currentPrice(nft),
      soldOut: isSoldOut(nft),
      editions: nft.editions.map((e) => ({ id: e.id, priceEth: e.priceEth, available: e.available })),
    },
  })
}

function buildOrderEvent(order: OrderRecord): OrderUpdatedEvent {
  return validated(orderUpdatedEventSchema, {
    eventId: `evt_order_${order.id}_v${order.version}`,
    type: REALTIME_EVENTS.orderUpdated,
    occurredAt: order.updatedAt,
    resource: { type: 'order', id: order.id, version: order.version },
    data: {
      orderId: order.id,
      userId: order.userId,
      status: order.status,
      transactionHash: order.transaction?.hash ?? null,
      failureReason: order.failureReason,
    },
  })
}

function broadcast(event: string, payload: unknown, filter: (c: ServerConnection) => boolean = () => true) {
  for (const connection of connections) if (filter(connection)) connection.emit(event, payload)
}

/** O dono é conferido a cada envio: depois de logout ou expiração a conexão antiga deixa de receber. */
const ownedBy = (userId: string) => (connection: ServerConnection) => userIdForToken(connection.token) === userId

/** Lê o `auth` do pacote CONNECT ("40{...}") que o binding não expõe. */
function readHandshakeToken(raw: unknown): string | null | undefined {
  if (typeof raw !== 'string' || !raw.startsWith('40')) return undefined
  const payload = raw.slice(2)
  if (payload === '' || payload.startsWith('/')) return null
  try {
    const parsed = handshakeAuthSchema.safeParse(JSON.parse(payload))
    return parsed.success ? (parsed.data.token ?? null) : null
  } catch {
    return null
  }
}

function findOwnedOrder(connection: ServerConnection, payload: unknown) {
  const parsed = orderSubscriptionSchema.safeParse(payload)
  if (!parsed.success) return null
  const order = db.state.orders.find((o) => o.id === parsed.data.orderId)
  return order && order.userId === userIdForToken(connection.token) ? order : null
}

function accept({ client }: WebSocketHandlerConnection, io: ReturnType<typeof toSocketIo>) {
  const heartbeat = window.setInterval(() => client.send('2'), PING_INTERVAL_MS)
  const connection: ServerConnection = {
    id: ++connectionSeq,
    token: null,
    subscriptions: new Set(),
    emit: (event, payload) => io.client.emit(event, payload),
    close: () => client.close(SERVER_CLOSE_CODE, 'Servidor encerrou a conexão'),
  }
  connections.add(connection)

  client.addEventListener('message', (event) => {
    const token = readHandshakeToken(event.data)
    if (token !== undefined) connection.token = token
  })
  client.addEventListener('close', () => {
    window.clearInterval(heartbeat)
    connections.delete(connection)
  })

  io.client.on(REALTIME_CLIENT_EVENTS.subscribeOrder, (_event, payload: unknown) => {
    const order = findOwnedOrder(connection, payload)
    if (!order) return
    connection.subscriptions.add(order.id)
    // Entrega o estado atual na assinatura: quem reconecta com um pedido pendente se reconcilia na hora.
    connection.emit(REALTIME_EVENTS.orderUpdated, buildOrderEvent(order))
  })
  io.client.on(REALTIME_CLIENT_EVENTS.unsubscribeOrder, (_event, payload: unknown) => {
    const parsed = orderSubscriptionSchema.safeParse(payload)
    if (parsed.success) connection.subscriptions.delete(parsed.data.orderId)
  })
}

export const realtimeHandler = ws.link(env.socketUrl).addEventListener('connection', (connection) => {
  if (paused || isOffline()) {
    connection.client.close(SERVER_CLOSE_CODE, 'Servidor indisponível')
    return
  }
  accept(connection, toSocketIo(connection))
})

export function publishNftUpdated(nft: NftRecord) {
  const event = buildNftEvent(nft)
  const last = lastNftEvent.get(nft.id)
  if (last) previousNftEvent.set(nft.id, last)
  lastNftEvent.set(nft.id, event)
  broadcast(REALTIME_EVENTS.nftUpdated, event)
}

export function publishOrderUpdated(order: OrderRecord) {
  broadcast(REALTIME_EVENTS.orderUpdated, buildOrderEvent(order), ownedBy(order.userId))
}

function withDoubledPrices(event: NftUpdatedEvent): NftUpdatedEvent {
  const { data } = event
  return {
    ...event,
    data: {
      ...data,
      priceEth: mulEth(data.priceEth, 2),
      editions: data.editions.map((e) => ({ ...e, priceEth: mulEth(e.priceEth, 2) })),
    },
  }
}

function requireNft(nftId: string) {
  const nft = db.state.nfts.find((n) => n.id === nftId)
  if (!nft) throw new Error(`NFT inexistente: ${nftId}`)
  return nft
}

export const realtimeServer = {
  /** Reenvia o último fato com o mesmo eventId: o cliente deve tratar como duplicata. */
  replayLast(nftId: string) {
    const event = lastNftEvent.get(nftId) ?? buildNftEvent(requireNft(nftId))
    broadcast(REALTIME_EVENTS.nftUpdated, event)
  },

  /**
   * Entrega atrasada de um estado anterior (eventId novo, versão menor). Sem histórico, o preço vai
   * dobrado para que um cliente que aplique o evento por engano fique visivelmente errado.
   */
  emitStale(nftId: string) {
    const nft = requireNft(nftId)
    const stale = previousNftEvent.get(nftId) ?? withDoubledPrices(buildNftEvent(nft, Math.max(1, nft.version - 1)))
    broadcast(REALTIME_EVENTS.nftUpdated, { ...stale, eventId: `${stale.eventId}_late${++lateSeq}` })
  },

  disconnect() {
    for (const connection of [...connections]) connection.close()
  },

  pause() {
    paused = true
    realtimeServer.disconnect()
  },

  resume() {
    paused = false
  },

  isPaused: () => paused,

  connectionCount: () => connections.size,

  resetHistory() {
    lastNftEvent.clear()
    previousNftEvent.clear()
  },
}
