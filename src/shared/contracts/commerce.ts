import { z } from 'zod'
import { ethAmountSchema, isoDateSchema, networkSchema, walletProviderSchema } from './common'
import { artworkKeySchema } from './nft'

/* ---------- Favoritos ---------- */

/** GET /api/me/favorites */
export const favoritesResponseSchema = z.object({ nftIds: z.array(z.string()) })
export type FavoritesResponse = z.infer<typeof favoritesResponseSchema>

/* ---------- Carrinho ---------- */

/**
 * O carrinho vive no servidor (mock). Visitantes são identificados pelo header `X-Cart-Id`
 * (uuid gerado no cliente e salvo no localStorage); usuários autenticados usam o carrinho da conta.
 */
export const CART_ID_HEADER = 'X-Cart-Id'

export const cartItemSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  editionLabel: z.string(),
  name: z.string(),
  tokenId: z.string(),
  artwork: artworkKeySchema,
  quantity: z.number().int().min(1),
  /** Preço unitário vigente no catálogo */
  unitPriceEth: ethAmountSchema,
  /** Preço no momento em que o item entrou (ou foi confirmado) no carrinho */
  addedUnitPriceEth: ethAmountSchema,
  /** Disponibilidade atual da edição */
  available: z.number().int().min(0),
  lineTotalEth: ethAmountSchema,
})
export type CartItem = z.infer<typeof cartItemSchema>

export const cartSchema = z.object({
  id: z.string(),
  ownerType: z.enum(['guest', 'user']),
  items: z.array(cartItemSchema),
  couponCode: z.string().nullable(),
  version: z.number().int().min(1),
  updatedAt: isoDateSchema,
})
export type Cart = z.infer<typeof cartSchema>

export const addCartItemRequestSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().min(1),
})
export type AddCartItemRequest = z.infer<typeof addCartItemRequestSchema>

export const updateCartItemRequestSchema = z.object({ quantity: z.number().int().min(1) })
export type UpdateCartItemRequest = z.infer<typeof updateCartItemRequestSchema>

/** POST /api/cart/merge — chamado após login para levar os itens do visitante para a conta. */
export const mergeCartRequestSchema = z.object({ guestCartId: z.string() })

export const applyCouponRequestSchema = z.object({
  code: z.string().trim().min(1, 'Informe o código promocional').max(32),
})
export type ApplyCouponRequest = z.infer<typeof applyCouponRequestSchema>

/* ---------- Cotação ---------- */

export const quoteIssueSchema = z.object({
  itemId: z.string(),
  kind: z.enum(['price-changed', 'quantity-reduced', 'sold-out']),
  message: z.string(),
  previousPriceEth: ethAmountSchema.optional(),
  currentPriceEth: ethAmountSchema.optional(),
  available: z.number().int().min(0).optional(),
})
export type QuoteIssue = z.infer<typeof quoteIssueSchema>

export const couponStatusSchema = z.object({
  code: z.string(),
  status: z.enum(['applied', 'invalid', 'expired']),
  description: z.string(),
})

/**
 * GET /api/cart/quote?network=ethereum
 * Fonte de verdade para valores exibidos no resumo e para fechar o pedido.
 * `hash` muda sempre que preço, disponibilidade, cupom ou taxa mudam.
 */
export const quoteSchema = z.object({
  id: z.string(),
  hash: z.string(),
  cartId: z.string(),
  cartVersion: z.number().int(),
  network: networkSchema,
  lines: z.array(
    z.object({
      itemId: z.string(),
      nftId: z.string(),
      editionId: z.string(),
      quantity: z.number().int().min(0),
      unitPriceEth: ethAmountSchema,
      lineTotalEth: ethAmountSchema,
    }),
  ),
  subtotalEth: ethAmountSchema,
  discountEth: ethAmountSchema,
  networkFeeEth: ethAmountSchema,
  totalEth: ethAmountSchema,
  coupon: couponStatusSchema.nullable(),
  issues: z.array(quoteIssueSchema),
  createdAt: isoDateSchema,
  expiresAt: isoDateSchema,
})
export type Quote = z.infer<typeof quoteSchema>

/* ---------- Pedidos ---------- */

export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key'

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'rejected'])
export type OrderStatus = z.infer<typeof orderStatusSchema>

export const collectorInfoSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição').max(40),
  username: z.string().trim().min(3, 'Informe o nome de usuário').max(24),
  network: networkSchema,
  profileName: z.string().trim().min(2, 'Informe o nome do perfil').max(40),
  walletAddress: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais'),
  ensOrSecondary: z.string().trim().max(64).optional().or(z.literal('')),
  walletProvider: walletProviderSchema,
  referralCode: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{4,12}$/i, 'Código de indicação inválido (4 a 12 letras ou números)'),
  email: z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido'),
  ensName: z
    .string()
    .trim()
    .min(1, 'Informe o nome ENS')
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífen'),
  ensSuffix: z.enum(['.eth', '.kurio']),
  useOtherWallet: z.boolean(),
  note: z.string().trim().max(280, 'Use no máximo 280 caracteres').optional().or(z.literal('')),
})
export type CollectorInfo = z.infer<typeof collectorInfoSchema>

/**
 * POST /api/orders (header Idempotency-Key obrigatório)
 * - 202 + pedido `pending` na primeira tentativa;
 * - 200 + o mesmo pedido quando a chave se repete com o mesmo conteúdo;
 * - 409 IDEMPOTENCY_CONFLICT quando a chave se repete com conteúdo diferente;
 * - 409 QUOTE_OUTDATED (details: Quote atual) quando `quoteHash` não confere.
 */
export const createOrderRequestSchema = z.object({
  quoteId: z.string(),
  quoteHash: z.string(),
  walletId: z.string(),
  network: networkSchema,
  collector: collectorInfoSchema,
})
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>

export const orderItemSchema = z.object({
  cartItemId: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  editionLabel: z.string(),
  name: z.string(),
  tokenId: z.string(),
  artwork: artworkKeySchema,
  quantity: z.number().int().min(1),
  unitPriceEth: ethAmountSchema,
  lineTotalEth: ethAmountSchema,
})
export type OrderItem = z.infer<typeof orderItemSchema>

/** Snapshot imutável do pedido: o recibo nunca é recalculado a partir do catálogo. */
export const orderSchema = z.object({
  id: z.string(),
  status: orderStatusSchema,
  version: z.number().int().min(1),
  idempotencyKey: z.string(),
  userId: z.string(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  items: z.array(orderItemSchema),
  subtotalEth: ethAmountSchema,
  discountEth: ethAmountSchema,
  networkFeeEth: ethAmountSchema,
  totalEth: ethAmountSchema,
  couponCode: z.string().nullable(),
  network: networkSchema,
  wallet: z.object({
    id: z.string(),
    label: z.string(),
    address: z.string(),
    provider: walletProviderSchema,
  }),
  transaction: z
    .object({
      hash: z.string(),
      explorerUrl: z.string(),
      confirmedAt: isoDateSchema,
    })
    .nullable(),
  failureReason: z.string().nullable(),
})
export type Order = z.infer<typeof orderSchema>

/** GET /api/me/orders?status=pending */
export const ordersResponseSchema = z.object({ items: z.array(orderSchema) })
