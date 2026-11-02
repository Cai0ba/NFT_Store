import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { getCatalog } from '@/api/endpoints/catalog'
import { queryKeys } from '@/api/query-keys'
import { STALE_TIME } from '@/app/query-client'
import type { CatalogQuery } from '@/shared/contracts'

/**
 * A chave inclui todos os parâmetros: uma resposta lenta de um filtro antigo cai na chave dela e
 * nunca sobrescreve a lista atual. Ao trocar de chave o TanStack Query aborta a requisição anterior.
 */
export function catalogQueryOptions(query: CatalogQuery) {
  return queryOptions({
    queryKey: queryKeys.catalog.list(query),
    queryFn: ({ signal }) => getCatalog(query, { signal }),
    staleTime: STALE_TIME.catalog,
  })
}

export function useCatalog(query: CatalogQuery) {
  return useQuery({ ...catalogQueryOptions(query), placeholderData: keepPreviousData })
}
