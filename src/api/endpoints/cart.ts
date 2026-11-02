import {
  cartSchema,
  quoteSchema,
  type AddCartItemRequest,
  type ApplyCouponRequest,
  type Cart,
  type Network,
  type Quote,
  type UpdateCartItemRequest,
} from '@/shared/contracts'
import { http, parseResponse, type RequestOptions } from '../http'

const cartConfig = (signal?: AbortSignal) => ({ signal, guestCart: true })

export async function getCart({ signal }: RequestOptions = {}): Promise<Cart> {
  const { data } = await http.get('/cart', cartConfig(signal))
  return parseResponse(cartSchema, data)
}

export async function addCartItem(body: AddCartItemRequest, { signal }: RequestOptions = {}): Promise<Cart> {
  const { data } = await http.post('/cart/items', body, cartConfig(signal))
  return parseResponse(cartSchema, data)
}

export async function updateCartItem(
  itemId: string,
  body: UpdateCartItemRequest,
  { signal }: RequestOptions = {},
): Promise<Cart> {
  const { data } = await http.patch(`/cart/items/${encodeURIComponent(itemId)}`, body, cartConfig(signal))
  return parseResponse(cartSchema, data)
}

export async function removeCartItem(itemId: string, { signal }: RequestOptions = {}): Promise<Cart> {
  const { data } = await http.delete(`/cart/items/${encodeURIComponent(itemId)}`, cartConfig(signal))
  return parseResponse(cartSchema, data)
}

export async function mergeGuestCart(guestCartId: string, { signal }: RequestOptions = {}): Promise<Cart> {
  const { data } = await http.post('/cart/merge', { guestCartId }, { signal })
  return parseResponse(cartSchema, data)
}

export async function applyCoupon(body: ApplyCouponRequest, { signal }: RequestOptions = {}): Promise<Cart> {
  const { data } = await http.post('/cart/coupon', body, cartConfig(signal))
  return parseResponse(cartSchema, data)
}

export async function removeCoupon({ signal }: RequestOptions = {}): Promise<Cart> {
  const { data } = await http.delete('/cart/coupon', cartConfig(signal))
  return parseResponse(cartSchema, data)
}

export async function getCartQuote(network: Network, { signal }: RequestOptions = {}): Promise<Quote> {
  const { data } = await http.get('/cart/quote', { ...cartConfig(signal), params: { network } })
  return parseResponse(quoteSchema, data)
}
