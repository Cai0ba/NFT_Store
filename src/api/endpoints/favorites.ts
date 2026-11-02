import { favoritesResponseSchema, type FavoritesResponse } from '@/shared/contracts'
import { http, parseResponse, type RequestOptions } from '../http'

export async function getFavorites({ signal }: RequestOptions = {}): Promise<FavoritesResponse> {
  const { data } = await http.get('/me/favorites', { signal })
  return parseResponse(favoritesResponseSchema, data)
}

export async function addFavorite(nftId: string, { signal }: RequestOptions = {}): Promise<void> {
  await http.put(`/me/favorites/${encodeURIComponent(nftId)}`, undefined, { signal })
}

export async function removeFavorite(nftId: string, { signal }: RequestOptions = {}): Promise<void> {
  await http.delete(`/me/favorites/${encodeURIComponent(nftId)}`, { signal })
}
