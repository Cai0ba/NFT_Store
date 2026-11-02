import { delay } from 'msw'
import { IDEMPOTENCY_KEY_HEADER, orderSchema, ordersResponseSchema } from '@/shared/contracts'
import { runtime } from '../runtime'
import { requireAuth } from '../services/auth'
import { createOrder, getOrder, listOrders } from '../services/orders'
import { jsonResponse } from './respond'
import { readJson, route } from './route'

export const ordersHandlers = [
  route('post', '/orders', async ({ request }) => {
    const auth = requireAuth(request)
    const { order, created } = createOrder(auth, request.headers.get(IDEMPOTENCY_KEY_HEADER), await readJson(request))
    // Cenário order-timeout: o pedido já existe, só a resposta se perde; repetir a chave recupera o mesmo pedido.
    const lateBy = runtime.scenario().orderResponseDelayMs
    if (created && lateBy > 0) await delay(lateBy)
    return jsonResponse(orderSchema, order, created ? 202 : 200)
  }),

  route('get', '/orders/:id', ({ request, params }) => jsonResponse(orderSchema, getOrder(requireAuth(request), params.id ?? ''))),

  route('get', '/me/orders', ({ request, url }) =>
    jsonResponse(ordersResponseSchema, { items: listOrders(requireAuth(request), url.searchParams.get('status')) }),
  ),
]
