import { z } from 'zod'
import {
  createOrderRequestSchema,
  orderStatusSchema,
  type CreateOrderRequest,
  type Order,
  type OrderItem,
  type Quote,
} from '@/shared/contracts'
import { percentOfEth } from '@/shared/lib/money'
import { db } from '../db/store'
import type { CartRecord, OrderRecord } from '../db/schema'
import { canonicalJson, stableHash } from '../lib/hash'
import { nowIso } from '../lib/text'
import { runtime } from '../runtime'
import type { AuthContext } from './auth'
import { applyNftChange, findNft } from './catalog'
import { userCart } from './cart'
import { fail, MockApiError, parseOrFail } from './errors'
import { schedulePayment } from './payments'
import { buildQuote } from './quote'
import { activeConnection, findUserWallet } from './wallets'

const idempotencyKeySchema = z.string().trim().min(8).max(128)

export function toOrder(record: OrderRecord): Order {
  const { settleAt: _settleAt, ...order } = record
  return order
}

function requireIdempotencyKey(raw: string | null) {
  const parsed = idempotencyKeySchema.safeParse(raw)
  if (!parsed.success) {
    throw fail.validation({ idempotencyKey: 'Envie o cabeçalho Idempotency-Key (8 a 128 caracteres)' }, 'Chave de idempotência ausente ou inválida.')
  }
  return parsed.data
}

/** Cenários de checkout: na primeira tentativa o servidor altera o primeiro item antes de validar a cotação. */
function applyCheckoutTwist(cart: CartRecord) {
  const twist = runtime.scenario().checkoutTwist
  const first = cart.items[0]
  if (!twist || !first || db.state.flags.checkoutTwistUsed) return
  db.mutate((s) => {
    s.flags.checkoutTwistUsed = true
  })
  const edition = findNft(first.nftId)?.editions.find((e) => e.id === first.editionId)
  if (!edition) return
  if (twist === 'price-increase') {
    applyNftChange({ nftId: first.nftId, editionId: first.editionId, priceEth: percentOfEth(edition.priceEth, 110) })
  } else {
    applyNftChange({ nftId: first.nftId, editionId: first.editionId, available: 0 })
  }
}

function snapshotItems(cart: CartRecord, quote: Quote): OrderItem[] {
  return quote.lines.flatMap((line) => {
    const nft = findNft(line.nftId)
    const edition = nft?.editions.find((e) => e.id === line.editionId)
    const item = cart.items.find((i) => i.id === line.itemId)
    if (!nft || !edition || !item || line.quantity === 0) return []
    return [
      {
        cartItemId: item.id,
        nftId: nft.id,
        editionId: edition.id,
        editionLabel: edition.label,
        name: nft.name,
        tokenId: nft.tokenId,
        artwork: nft.artwork,
        quantity: line.quantity,
        unitPriceEth: line.unitPriceEth,
        lineTotalEth: line.lineTotalEth,
      },
    ]
  })
}

function assertWalletReady(userId: string, input: CreateOrderRequest) {
  const wallet = findUserWallet(userId, input.walletId)
  if (!wallet) throw fail.notFound('Carteira não encontrada.')
  const connection = activeConnection(userId)
  if (!connection || connection.walletId !== wallet.id || connection.network !== input.network) {
    throw fail.conflict('WALLET_NOT_CONNECTED', 'Conecte a carteira selecionada na rede escolhida antes de confirmar.')
  }
  return wallet
}

export function createOrder(auth: AuthContext, rawKey: string | null, body: unknown): { order: Order; created: boolean } {
  const userId = auth.user.id
  const key = requireIdempotencyKey(rawKey)
  const input = parseOrFail(createOrderRequestSchema, body)
  const bodyHash = stableHash(canonicalJson(input), 4)

  const previous = db.state.idempotency.find((r) => r.userId === userId && r.key === key)
  if (previous) {
    if (previous.bodyHash !== bodyHash) {
      throw fail.conflict('IDEMPOTENCY_CONFLICT', 'Esta chave de idempotência já foi usada com outro conteúdo.')
    }
    const existing = db.state.orders.find((o) => o.id === previous.orderId)
    if (existing) return { order: toOrder(existing), created: false }
  }

  const wallet = assertWalletReady(userId, input)
  const cart = userCart(userId)
  applyCheckoutTwist(cart)
  const quote = buildQuote(cart, input.network)
  if (quote.hash !== input.quoteHash) {
    throw fail.conflict('QUOTE_OUTDATED', 'Os valores do pedido mudaram. Revise a nova cotação antes de confirmar.', { details: quote })
  }
  const items = snapshotItems(cart, quote)
  if (items.length === 0) throw new MockApiError(409, 'CONFLICT', 'Não há itens disponíveis para compra no carrinho.')

  const now = nowIso()
  const record: OrderRecord = {
    id: db.nextId('ord'),
    status: 'pending',
    version: 1,
    idempotencyKey: key,
    userId,
    createdAt: now,
    updatedAt: now,
    items,
    subtotalEth: quote.subtotalEth,
    discountEth: quote.discountEth,
    networkFeeEth: quote.networkFeeEth,
    totalEth: quote.totalEth,
    couponCode: quote.coupon?.code ?? null,
    network: input.network,
    wallet: { id: wallet.id, label: wallet.nickname, address: wallet.address, provider: wallet.provider },
    transaction: null,
    failureReason: null,
    settleAt: null,
  }
  db.mutate((s) => {
    s.orders.push(record)
    s.idempotency.push({ userId, key, bodyHash, orderId: record.id })
  })
  schedulePayment(record)
  return { order: toOrder(record), created: true }
}

export function getOrder(auth: AuthContext, orderId: string): Order {
  const order = db.state.orders.find((o) => o.id === orderId)
  if (!order) throw fail.notFound('Pedido não encontrado.')
  if (order.userId !== auth.user.id) throw fail.forbidden('Este pedido pertence a outra conta.')
  return toOrder(order)
}

export function listOrders(auth: AuthContext, rawStatus: string | null): Order[] {
  const status = rawStatus === null ? null : orderStatusSchema.safeParse(rawStatus)
  if (status && !status.success) throw fail.validation({ status: 'Status de pedido inválido' })
  return db.state.orders
    .filter((o) => o.userId === auth.user.id && (!status || o.status === status.data))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
    .map(toOrder)
}
