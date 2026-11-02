import {
  IDEMPOTENCY_KEY_HEADER,
  orderSchema,
  ordersResponseSchema,
  type CreateOrderRequest,
  type Order,
  type OrderStatus,
} from '@/shared/contracts'
import { http, ORDER_TIMEOUT_MS, parseResponse, type RequestOptions } from '../http'

export async function createOrder(
  body: CreateOrderRequest,
  idempotencyKey: string,
  { signal }: RequestOptions = {},
): Promise<Order> {
  const { data } = await http.post('/orders', body, {
    signal,
    timeout: ORDER_TIMEOUT_MS,
    headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
  })
  return parseResponse(orderSchema, data)
}

export async function getOrder(id: string, { signal }: RequestOptions = {}): Promise<Order> {
  const { data } = await http.get(`/orders/${encodeURIComponent(id)}`, { signal })
  return parseResponse(orderSchema, data)
}

export async function getMyOrders(status: OrderStatus, { signal }: RequestOptions = {}): Promise<Order[]> {
  const { data } = await http.get('/me/orders', { signal, params: { status } })
  return parseResponse(ordersResponseSchema, data).items
}
