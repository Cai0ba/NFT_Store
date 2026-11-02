import { favoritesResponseSchema } from '@/shared/contracts'
import { requireAuth } from '../services/auth'
import { listFavorites, setFavorite } from '../services/favorites'
import { jsonResponse, noContent } from './respond'
import { route } from './route'

export const favoritesHandlers = [
  route('get', '/me/favorites', ({ request }) => {
    const { user } = requireAuth(request)
    return jsonResponse(favoritesResponseSchema, { nftIds: listFavorites(user.id) })
  }),

  route('put', '/me/favorites/:nftId', ({ request, params }) => {
    setFavorite(requireAuth(request).user.id, params.nftId ?? '', true)
    return noContent()
  }),

  route('delete', '/me/favorites/:nftId', ({ request, params }) => {
    setFavorite(requireAuth(request).user.id, params.nftId ?? '', false)
    return noContent()
  }),
]
