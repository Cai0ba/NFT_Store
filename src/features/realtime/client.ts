import type { QueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { REALTIME_CLIENT_EVENTS, REALTIME_EVENTS } from '@/shared/contracts'
import { env } from '@/shared/config/env'
import { createRealtimeHandlers } from './handlers'

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

// Depois de algumas tentativas sem sucesso a UI passa a tratar como queda prolongada.
const ATTEMPTS_BEFORE_DISCONNECTED = 3
const RECONNECT_DELAY_MS = 1_000
const RECONNECT_DELAY_MAX_MS = 5_000

let status: RealtimeStatus = 'idle'
const statusListeners = new Set<() => void>()
let activeSocket: Socket | null = null
const orderSubscriptions = new Map<string, number>()

function setStatus(next: RealtimeStatus) {
  if (status === next) return
  status = next
  statusListeners.forEach((listener) => listener())
}

export const realtimeStatusStore = {
  getStatus: () => status,
  subscribe(listener: () => void) {
    statusListeners.add(listener)
    return () => {
      statusListeners.delete(listener)
    }
  },
}

/**
 * Assina atualizações de um pedido enquanto houver interessados. A assinatura é refeita a cada
 * reconexão, porque o servidor esquece as salas do socket anterior.
 */
export function subscribeToOrder(orderId: string): () => void {
  const count = orderSubscriptions.get(orderId) ?? 0
  orderSubscriptions.set(orderId, count + 1)
  if (count === 0 && activeSocket?.connected) activeSocket.emit(REALTIME_CLIENT_EVENTS.subscribeOrder, { orderId })

  let released = false
  return () => {
    if (released) return
    released = true
    const current = orderSubscriptions.get(orderId) ?? 0
    if (current <= 1) {
      orderSubscriptions.delete(orderId)
      if (activeSocket?.connected) activeSocket.emit(REALTIME_CLIENT_EVENTS.unsubscribeOrder, { orderId })
    } else {
      orderSubscriptions.set(orderId, current - 1)
    }
  }
}

interface StartOptions {
  queryClient: QueryClient
  token: string | null
  userId: string | null
}

/**
 * Abre o único socket da aplicação para a sessão informada e devolve a função que o encerra.
 * Trocar de sessão = encerrar e abrir outro, nunca reaproveitar: listeners e deduplicação pertencem
 * à sessão que os criou. As assinaturas de pedido são dos componentes e são reenviadas no novo socket
 * (o servidor só entrega `order.updated` ao dono, e o handler ainda confere o usuário).
 */
export function startRealtime({ queryClient, token, userId }: StartOptions): () => void {
  let disposed = false
  let socket: Socket | null = null
  let manualTimer: ReturnType<typeof setTimeout> | undefined
  let manualAttempts = 0
  let hasConnected = false
  const handlers = createRealtimeHandlers(queryClient, userId)

  setStatus('connecting')

  const scheduleManualReconnect = () => {
    // Desconexão pelo servidor ou recusa no handshake desligam a reconexão automática do Socket.IO.
    clearTimeout(manualTimer)
    manualAttempts += 1
    const base = Math.min(RECONNECT_DELAY_MS * 2 ** (manualAttempts - 1), RECONNECT_DELAY_MAX_MS)
    const delay = base / 2 + Math.random() * (base / 2)
    setStatus(
      manualAttempts > ATTEMPTS_BEFORE_DISCONNECTED ? 'disconnected' : hasConnected ? 'reconnecting' : 'connecting',
    )
    manualTimer = setTimeout(() => {
      if (!disposed) socket?.connect()
    }, delay)
  }

  const onOnline = () => {
    if (socket && !socket.connected) {
      clearTimeout(manualTimer)
      socket.connect()
    }
  }

  // O cliente Socket.IO fica fora do bundle inicial; o catálogo não depende dele para renderizar.
  void import('socket.io-client').then(({ io }) => {
    if (disposed) return
    socket = io(env.socketUrl, {
      // O MSW intercepta WebSocket; long-polling HTTP não é suportado pelo binding de mocks.
      transports: ['websocket'],
      auth: token ? { token } : {},
      reconnection: true,
      reconnectionDelay: RECONNECT_DELAY_MS,
      reconnectionDelayMax: RECONNECT_DELAY_MAX_MS,
      randomizationFactor: 0.5,
      // O padrão de 20 s deixaria o usuário tempo demais com preços possivelmente defasados quando o
      // handshake fica pendurado (ex.: servidor recusando conexões durante uma queda).
      timeout: 6_000,
    })
    activeSocket = socket
    const current = socket

    current.on('connect', () => {
      clearTimeout(manualTimer)
      manualAttempts = 0
      hasConnected = true
      setStatus('connected')
      for (const orderId of orderSubscriptions.keys()) {
        current.emit(REALTIME_CLIENT_EVENTS.subscribeOrder, { orderId })
      }
      handlers.reconcile()
    })
    current.on('disconnect', (reason) => {
      if (disposed || reason === 'io client disconnect') return
      if (current.active) setStatus('reconnecting')
      else scheduleManualReconnect()
    })
    current.on('connect_error', () => {
      if (disposed) return
      if (!current.active) scheduleManualReconnect()
    })
    current.io.on('reconnect_attempt', (attempt) => {
      setStatus(attempt > ATTEMPTS_BEFORE_DISCONNECTED ? 'disconnected' : 'reconnecting')
    })
    current.on(REALTIME_EVENTS.nftUpdated, handlers.onNftUpdated)
    current.on(REALTIME_EVENTS.orderUpdated, handlers.onOrderUpdated)
    window.addEventListener('online', onOnline)
  })

  return () => {
    disposed = true
    clearTimeout(manualTimer)
    window.removeEventListener('online', onOnline)
    if (socket) {
      socket.off()
      socket.io.off()
      socket.disconnect()
      if (activeSocket === socket) activeSocket = null
    }
    setStatus('idle')
  }
}
