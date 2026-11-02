import {
  addCartItemRequestSchema,
  applyCouponRequestSchema,
  cartSchema,
  mergeCartRequestSchema,
  networkSchema,
  quoteSchema,
  updateCartItemRequestSchema,
} from '@/shared/contracts'
import type { CartRecord } from '../db/schema'
import { optionalAuth, requireAuth } from '../services/auth'
import {
  addItem,
  applyCoupon,
  mergeGuestCart,
  removeCoupon,
  removeItem,
  resolveCart,
  toCartDto,
  updateItem,
} from '../services/cart'
import { fail, parseOrFail } from '../services/errors'
import { buildQuote } from '../services/quote'
import { jsonResponse } from './respond'
import { readJson, route, type RouteContext } from './route'

const currentCart = ({ request }: RouteContext) => resolveCart(request, optionalAuth(request))
const cartResponse = (cart: CartRecord) => jsonResponse(cartSchema, toCartDto(cart))

function readNetwork(url: URL) {
  const raw = url.searchParams.get('network')
  if (raw === null || raw === '') return 'ethereum'
  const parsed = networkSchema.safeParse(raw)
  if (!parsed.success) throw fail.validation({ network: 'Rede inválida' })
  return parsed.data
}

export const cartHandlers = [
  route('get', '/cart', (ctx) => cartResponse(currentCart(ctx))),

  route('post', '/cart/items', async (ctx) => {
    const cart = currentCart(ctx)
    const input = parseOrFail(addCartItemRequestSchema, await readJson(ctx.request))
    return cartResponse(addItem(cart, input))
  }),

  route('patch', '/cart/items/:itemId', async (ctx) => {
    const cart = currentCart(ctx)
    const { quantity } = parseOrFail(updateCartItemRequestSchema, await readJson(ctx.request))
    return cartResponse(updateItem(cart, ctx.params.itemId ?? '', quantity))
  }),

  route('delete', '/cart/items/:itemId', (ctx) => cartResponse(removeItem(currentCart(ctx), ctx.params.itemId ?? ''))),

  route('post', '/cart/merge', async ({ request }) => {
    const { user } = requireAuth(request)
    const { guestCartId } = parseOrFail(mergeCartRequestSchema, await readJson(request))
    return cartResponse(mergeGuestCart(user.id, guestCartId))
  }),

  route('post', '/cart/coupon', async (ctx) => {
    const cart = currentCart(ctx)
    const { code } = parseOrFail(applyCouponRequestSchema, await readJson(ctx.request))
    return cartResponse(applyCoupon(cart, code))
  }),

  route('delete', '/cart/coupon', (ctx) => cartResponse(removeCoupon(currentCart(ctx)))),

  route('get', '/cart/quote', (ctx) => jsonResponse(quoteSchema, buildQuote(currentCart(ctx), readNetwork(ctx.url)))),
]
