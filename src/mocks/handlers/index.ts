import { http, passthrough } from 'msw'
import { env } from '@/shared/config/env'
import { realtimeHandler } from '../realtime'
import { accountHandlers } from './account'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { catalogHandlers } from './catalog'
import { favoritesHandlers } from './favorites'
import { ordersHandlers } from './orders'

const API_PREFIX = new URL(env.apiUrl.replace(/\/?$/, '/'), location.origin).href

/*
 * O worker repassa ao MSW toda requisição da página (chunks, fontes, imagens). Sem este atalho cada
 * asset percorre os ~30 handlers, e cada um lê document.cookie: no mobile isso custava segundos de CPU.
 * Fora da API o resultado é o mesmo do onUnhandledRequest: 'bypass'.
 */
const assetsBypass = http.all(
  ({ request }) => !request.url.startsWith(API_PREFIX),
  () => passthrough(),
)

export const handlers = [
  assetsBypass,
  ...authHandlers,
  ...catalogHandlers,
  ...favoritesHandlers,
  ...cartHandlers,
  ...ordersHandlers,
  ...accountHandlers,
  realtimeHandler,
]
