import { useSyncExternalStore } from 'react'
import { sessionStore } from '@/features/auth/session-store'
import type { EthAmount } from '@/shared/contracts'

export type CartChangeKind = 'price-increased' | 'price-decreased' | 'availability-reduced' | 'sold-out' | 'back-in-stock'

export interface CartChangeNotice {
  id: string
  itemId: string
  nftId: string
  name: string
  editionLabel: string
  kind: CartChangeKind
  previousPriceEth: EthAmount
  currentPriceEth: EthAmount
  previousAvailable: number
  available: number
  /** Quantidade no carrinho no momento do evento, para a UI dizer "você tem 3, restam 2". */
  quantity: number
  message: string
  occurredAt: string
}

let notices: CartChangeNotice[] = []
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

/** Mantém só o aviso mais recente de cada item: o que importa é o estado atual, não o histórico. */
export function pushCartNotices(next: CartChangeNotice[]) {
  if (next.length === 0) return
  const replaced = new Set(next.map((n) => n.itemId))
  notices = [...notices.filter((n) => !replaced.has(n.itemId)), ...next]
  emit()
}

export function dismissCartNotice(id: string) {
  const filtered = notices.filter((n) => n.id !== id)
  if (filtered.length === notices.length) return
  notices = filtered
  emit()
}

export function clearCartNotices() {
  if (notices.length === 0) return
  notices = []
  emit()
}

export function useCartNoticeStore(): CartChangeNotice[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => notices,
    () => notices,
  )
}

sessionStore.subscribe((next, prev) => {
  if (next.user?.id !== prev.user?.id) clearCartNotices()
})
