import { useSyncExternalStore } from 'react'
import { z } from 'zod'
import { sessionStore } from '@/features/auth/session-store'
import { readStorage, removeStorage, writeStorage } from '@/shared/lib/storage'

/**
 * Pedido em andamento do usuário, salvo no localStorage para ser retomado após refresh, queda de
 * conexão ou expiração de sessão. Fica separado por usuário: outro login nunca vê o pedido alheio.
 */
const pendingSchema = z.object({ orderId: z.string().min(1) })
const storageName = (userId: string) => `pendingOrder.${userId}`

interface PendingState {
  userId: string | null
  orderId: string | null
}

function load(userId: string | null): PendingState {
  return { userId, orderId: userId ? (readStorage('local', storageName(userId), pendingSchema)?.orderId ?? null) : null }
}

let state = load(sessionStore.getState().user?.id ?? null)
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

sessionStore.subscribe((next) => {
  const userId = next.user?.id ?? null
  if (userId !== state.userId) {
    state = load(userId)
    emit()
  }
})

export function getPendingOrderId() {
  return state.orderId
}

export function savePendingOrder(orderId: string) {
  if (!state.userId || state.orderId === orderId) return
  writeStorage('local', storageName(state.userId), { orderId })
  state = { ...state, orderId }
  emit()
}

export function clearPendingOrder(orderId?: string) {
  if (!state.userId || !state.orderId) return
  if (orderId && state.orderId !== orderId) return
  removeStorage('local', storageName(state.userId))
  state = { ...state, orderId: null }
  emit()
}

export function usePendingOrderId(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => state.orderId,
    () => state.orderId,
  )
}
