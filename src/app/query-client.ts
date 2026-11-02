import { QueryClient } from '@tanstack/react-query'
import { isTransientError } from '@/api/errors'

/**
 * Política de cache e retry (detalhada no ARCHITECTURE.md):
 * - staleTime por recurso: catálogo e detalhe 30s (o socket mantém preço/estoque em dia entre refetches);
 *   dados privados 0–15s e com refetch ao focar a janela, porque podem mudar em outra aba ou dispositivo.
 * - retry só para falhas transitórias (rede, timeout, 5xx), até 2 vezes com backoff exponencial;
 *   4xx nunca: repetir um 404 ou 409 só atrasa o feedback.
 * - mutations não repetem sozinhas. A criação de pedido tem estratégia própria com Idempotency-Key.
 */
export const STALE_TIME = {
  catalog: 30_000,
  nftDetail: 30_000,
  private: 15_000,
  cart: 5_000,
  quote: 5_000,
  order: 0,
} as const

const MAX_QUERY_RETRIES = 2

export function retryDelay(attempt: number) {
  const base = Math.min(1000 * 2 ** attempt, 8000)
  return base / 2 + Math.random() * (base / 2)
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME.catalog,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => failureCount < MAX_QUERY_RETRIES && isTransientError(error),
        retryDelay,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export const queryClient = createQueryClient()
