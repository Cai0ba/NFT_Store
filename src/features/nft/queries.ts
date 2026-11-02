import { queryOptions, useQuery } from '@tanstack/react-query'
import { getNftDetail } from '@/api/endpoints/catalog'
import { queryKeys } from '@/api/query-keys'
import { STALE_TIME } from '@/app/query-client'

export function nftDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.nft.detail(id),
    queryFn: ({ signal }) => getNftDetail(id, { signal }),
    staleTime: STALE_TIME.nftDetail,
  })
}

export function useNftDetail(id: string) {
  return useQuery(nftDetailQueryOptions(id))
}
