import { z } from 'zod'
import { ethAmountSchema, isoDateSchema } from './common'
import { orderStatusSchema } from './commerce'

/**
 * Todos os eventos Socket.IO compartilham o envelope abaixo:
 * - `eventId` é estável: reenvios do mesmo fato chegam com o mesmo id (deduplicação);
 * - `resource.version` cresce a cada mudança do recurso (eventos com versão <= conhecida são descartados).
 */
const envelope = <TType extends string, TResource extends string, TData extends z.ZodTypeAny>(
  type: TType,
  resource: TResource,
  data: TData,
) =>
  z.object({
    eventId: z.string(),
    type: z.literal(type),
    occurredAt: isoDateSchema,
    resource: z.object({ type: z.literal(resource), id: z.string(), version: z.number().int().min(1) }),
    data,
  })

export const nftUpdatedEventSchema = envelope(
  'nft.updated',
  'nft',
  z.object({
    nftId: z.string(),
    priceEth: ethAmountSchema,
    soldOut: z.boolean(),
    editions: z.array(z.object({ id: z.string(), priceEth: ethAmountSchema, available: z.number().int().min(0) })),
  }),
)
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>

export const orderUpdatedEventSchema = envelope(
  'order.updated',
  'order',
  z.object({
    orderId: z.string(),
    userId: z.string(),
    status: orderStatusSchema,
    transactionHash: z.string().nullable(),
    failureReason: z.string().nullable(),
  }),
)
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>

export const REALTIME_EVENTS = {
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
} as const

/** Cliente -> servidor: assinatura de recursos ativos (o servidor só envia order.updated ao dono). */
export const REALTIME_CLIENT_EVENTS = {
  subscribeOrder: 'order.subscribe',
  unsubscribeOrder: 'order.unsubscribe',
} as const
