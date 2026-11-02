import {
  catalogResponseSchema,
  nftDetailResponseSchema,
  type CatalogQuery,
  type CatalogResponse,
  type NftDetailResponse,
} from '@/shared/contracts'
import { http, parseResponse, type RequestOptions } from '../http'

export async function getCatalog(query: CatalogQuery, { signal }: RequestOptions = {}): Promise<CatalogResponse> {
  const { data } = await http.get('/nfts', { params: query, signal })
  return parseResponse(catalogResponseSchema, data)
}

export async function getNftDetail(id: string, { signal }: RequestOptions = {}): Promise<NftDetailResponse> {
  const { data } = await http.get(`/nfts/${encodeURIComponent(id)}`, { signal })
  return parseResponse(nftDetailResponseSchema, data)
}
