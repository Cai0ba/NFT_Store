import { queryOptions, replaceEqualDeep, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { getOrder } from '@/api/endpoints/orders'
import { hasErrorCode } from '@/api/errors'
import { queryKeys } from '@/api/query-keys'
import { STALE_TIME } from '@/app/query-client'
import { useSession } from '@/features/auth/session'
import { subscribeToOrder } from '@/features/realtime/client'
import type { Order, OrderStatus } from '@/shared/contracts'
import { clearPendingOrder, usePendingOrderId } from './pending-store'
import { isTerminalOrder } from './status'

export { isTerminalOrder } from './status'

/** Fallback do socket: enquanto o pedido estiver pendente, consulta o REST periodicamente. */
export const ORDER_POLL_INTERVAL_MS = 4_000

/**
 * Um refetch atrasado (ou um GET que cruzou com o evento) nunca pode trazer de volta um pedido
 * confirmado/recusado para "pendente", nem uma versão mais antiga.
 */
function keepNewestOrder(oldData: unknown, newData: unknown): unknown {
  const previous = oldData as Order | undefined
  const next = newData as Order
  if (previous) {
    if (isTerminalOrder(previous.status) && !isTerminalOrder(next.status)) return previous
    if (previous.version > next.version) return previous
  }
  return replaceEqualDeep(previous, next)
}

export function orderQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.order.detail(id),
    queryFn: ({ signal }) => getOrder(id, { signal }),
    staleTime: STALE_TIME.order,
    structuralSharing: keepNewestOrder,
  })
}

/**
 * Pedido por id. Enquanto pendente: assina `order.updated` no socket e faz polling de fallback.
 * Quando vira terminal, para o polling, libera a assinatura e encerra o pedido pendente salvo.
 */
export function useOrder(id: string | null) {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const query = useQuery({
    ...orderQueryOptions(id ?? ''),
    enabled: Boolean(id && user),
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? ORDER_POLL_INTERVAL_MS : false),
    refetchIntervalInBackground: true,
  })

  const status: OrderStatus | undefined = query.data?.status
  const userId = user?.id

  useEffect(() => {
    if (!id || !userId || (status && status !== 'pending')) return
    return subscribeToOrder(id)
  }, [id, userId, status])

  useEffect(() => {
    if (!id || !status || !isTerminalOrder(status)) return
    clearPendingOrder(id)
    // A confirmação tira itens do carrinho e muda o estoque; o polling pode ter chegado antes do evento.
    if (status === 'confirmed') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.nft.all })
    }
  }, [id, status, queryClient])

  return query
}

/** Pedido pendente salvo para retomada após refresh ou reconexão (null quando não há). */
export function usePendingOrder(): {
  orderId: string | null
  order: Order | undefined
  status: OrderStatus | null
  isLoading: boolean
  clear(): void
} {
  const orderId = usePendingOrderId()
  const query = useOrder(orderId)
  const gone = hasErrorCode(query.error, 'NOT_FOUND', 'FORBIDDEN')

  // Pedido salvo que o servidor não reconhece (base resetada, outro dono): não há o que retomar.
  useEffect(() => {
    if (orderId && gone) clearPendingOrder(orderId)
  }, [orderId, gone])

  return {
    orderId,
    order: query.data,
    status: query.data?.status ?? null,
    isLoading: query.isLoading,
    clear: () => clearPendingOrder(orderId ?? undefined),
  }
}
