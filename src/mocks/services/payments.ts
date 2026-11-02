import { db } from '../db/store'
import type { OrderRecord } from '../db/schema'
import { stableHash } from '../lib/hash'
import { nowIso } from '../lib/text'
import { publishOrderUpdated } from '../realtime'
import { runtime } from '../runtime'
import { decrementAvailability, findNft } from './catalog'
import { removePurchased } from './cart'

export const EXPLORER_BASE_URL = 'https://explorer.kurio.test/tx/'

const timers = new Map<string, number>()

function findOrder(orderId: string) {
  return db.state.orders.find((o) => o.id === orderId) ?? null
}

function arm(order: OrderRecord) {
  if (order.settleAt === null || timers.has(order.id)) return
  const timer = window.setTimeout(() => onTimer(order.id), Math.max(0, order.settleAt - Date.now()))
  timers.set(order.id, timer)
}

/** O desfecho é lido no disparo: trocar o desfecho no painel afeta pedidos que ainda estão aguardando. */
function onTimer(orderId: string) {
  timers.delete(orderId)
  const outcome = runtime.get().paymentOutcome
  if (outcome !== 'hold') {
    settleOrder(orderId, outcome)
    return
  }
  const order = findOrder(orderId)
  if (order) db.mutate(() => (order.settleAt = null))
}

/** Agenda a liquidação conforme o desfecho configurado; com "hold" o pedido espera `settle()` manual. */
export function schedulePayment(order: OrderRecord) {
  const { paymentOutcome, paymentDelayMs } = runtime.get()
  if (paymentOutcome === 'hold') return
  db.mutate(() => {
    order.settleAt = Date.now() + paymentDelayMs
  })
  arm(order)
}

function insufficientStock(order: OrderRecord) {
  return order.items.some((item) => {
    const edition = findNft(item.nftId)?.editions.find((e) => e.id === item.editionId)
    return !edition || edition.available < item.quantity
  })
}

function finish(order: OrderRecord, patch: Partial<OrderRecord>) {
  db.mutate(() => {
    Object.assign(order, patch, { version: order.version + 1, updatedAt: nowIso(), settleAt: null })
  })
  publishOrderUpdated(order)
}

export function settleOrder(orderId: string, outcome: 'confirm' | 'reject') {
  const timer = timers.get(orderId)
  if (timer !== undefined) window.clearTimeout(timer)
  timers.delete(orderId)

  const order = findOrder(orderId)
  // Confirmado e recusado são terminais: liquidar de novo não muda nada.
  if (!order || order.status !== 'pending') return order

  if (outcome === 'reject') {
    finish(order, { status: 'rejected', failureReason: 'O pagamento foi recusado pela carteira.' })
    return order
  }
  if (insufficientStock(order)) {
    finish(order, { status: 'rejected', failureReason: 'Uma das edições esgotou antes da confirmação do pagamento.' })
    return order
  }

  decrementAvailability(order.items)
  removePurchased(order.userId, order.items)
  const hash = `0x${stableHash(`tx:${order.id}:${order.idempotencyKey}`, 8)}`
  finish(order, {
    status: 'confirmed',
    transaction: { hash, explorerUrl: `${EXPLORER_BASE_URL}${hash}`, confirmedAt: nowIso() },
  })
  return order
}

export function settlePending(outcome: 'confirm' | 'reject') {
  for (const order of db.state.orders.filter((o) => o.status === 'pending')) settleOrder(order.id, outcome)
}

/** Depois de um refresh os pagamentos pendentes continuam de onde pararam. */
export function resumePendingPayments() {
  db.state.orders.filter((o) => o.status === 'pending').forEach(arm)
}

export function cancelPaymentTimers() {
  timers.forEach((timer) => window.clearTimeout(timer))
  timers.clear()
}
