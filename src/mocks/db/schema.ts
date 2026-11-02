import { z } from 'zod'
import {
  cartItemSchema,
  cartSchema,
  ensSuffixSchema,
  isoDateSchema,
  nftDetailSchema,
  orderSchema,
  walletConnectionSchema,
  walletSchema,
} from '@/shared/contracts'

/**
 * Formato persistido do "banco" do mock. Reaproveita os contratos para que o estado salvo
 * nunca divirja do que as rotas devolvem; preço e esgotamento do NFT são derivados das edições.
 */
export const nftRecordSchema = nftDetailSchema.omit({ priceEth: true, soldOut: true }).extend({
  featured: z.boolean(),
})
export type NftRecord = z.infer<typeof nftRecordSchema>

export const userRecordSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  walletNickname: z.string(),
  ensName: z.string(),
  ensSuffix: ensSuffixSchema,
  passwordHash: z.string(),
  passwordSalt: z.string(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})
export type UserRecord = z.infer<typeof userRecordSchema>

export const sessionRecordSchema = z.object({
  token: z.string(),
  userId: z.string(),
  createdAt: z.number(),
  expiresAt: z.number(),
})
export type SessionRecord = z.infer<typeof sessionRecordSchema>

export const cartItemRecordSchema = cartItemSchema
  .pick({ id: true, nftId: true, editionId: true, quantity: true, addedUnitPriceEth: true })
  .extend({ addedAt: isoDateSchema })
export type CartItemRecord = z.infer<typeof cartItemRecordSchema>

export const cartRecordSchema = cartSchema.omit({ items: true }).extend({
  userId: z.string().nullable(),
  items: z.array(cartItemRecordSchema),
})
export type CartRecord = z.infer<typeof cartRecordSchema>

export const walletRecordSchema = walletSchema.extend({ userId: z.string() })
export type WalletRecord = z.infer<typeof walletRecordSchema>

export const connectionRecordSchema = walletConnectionSchema.extend({ userId: z.string() })
export type ConnectionRecord = z.infer<typeof connectionRecordSchema>

/** `settleAt` sobrevive ao refresh para que o pagamento pendente seja liquidado depois de recarregar. */
export const orderRecordSchema = orderSchema.extend({ settleAt: z.number().nullable() })
export type OrderRecord = z.infer<typeof orderRecordSchema>

export const idempotencyRecordSchema = z.object({
  userId: z.string(),
  key: z.string(),
  bodyHash: z.string(),
  orderId: z.string(),
})
export type IdempotencyRecord = z.infer<typeof idempotencyRecordSchema>

export const seedKindSchema = z.enum(['full', 'empty-catalog'])
export type SeedKind = z.infer<typeof seedKindSchema>

export const dbStateSchema = z.object({
  schemaVersion: z.literal(1),
  seedKind: seedKindSchema,
  seq: z.number().int().min(0),
  nfts: z.array(nftRecordSchema),
  users: z.array(userRecordSchema),
  sessions: z.array(sessionRecordSchema),
  favorites: z.record(z.string(), z.array(z.string())),
  carts: z.array(cartRecordSchema),
  wallets: z.array(walletRecordSchema),
  connections: z.array(connectionRecordSchema),
  orders: z.array(orderRecordSchema),
  idempotency: z.array(idempotencyRecordSchema),
  flags: z.object({
    checkoutTwistUsed: z.boolean(),
    walletRejectionUsed: z.boolean(),
  }),
})
export type DbState = z.infer<typeof dbStateSchema>
