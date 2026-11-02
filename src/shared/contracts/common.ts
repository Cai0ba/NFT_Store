import { z } from 'zod'

/** Valores em ETH trafegam sempre como string decimal (até 18 casas) para não perder precisão. */
export const ethAmountSchema = z.string().regex(/^\d+(\.\d{1,18})?$/, 'Valor ETH inválido')
export type EthAmount = z.infer<typeof ethAmountSchema>

export const isoDateSchema = z.string().datetime({ offset: true })

export const networkSchema = z.enum(['ethereum', 'polygon', 'solana'], { error: 'Selecione uma rede' })
export type Network = z.infer<typeof networkSchema>

export const NETWORK_LABEL: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export const walletProviderSchema = z.enum(['metamask', 'walletconnect', 'coinbase'], {
  error: 'Selecione o tipo de carteira',
})
export type WalletProvider = z.infer<typeof walletProviderSchema>

export const WALLET_PROVIDER_LABEL: Record<WalletProvider, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

export const apiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'EMAIL_TAKEN',
  'USERNAME_TAKEN',
  'AVAILABILITY_CONFLICT',
  'EDITION_UNAVAILABLE',
  'QUOTE_OUTDATED',
  'IDEMPOTENCY_CONFLICT',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'WALLET_REJECTED',
  'WALLET_NOT_CONNECTED',
  'INVALID_CREDENTIALS',
  'INVALID_PASSWORD',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
])
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>

/** Envelope único de erro de todas as rotas REST. `fieldErrors` mapeia campo -> mensagem. */
export const apiErrorBodySchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    fieldErrors: z.record(z.string(), z.string()).optional(),
    details: z.unknown().optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>

export const paginationSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
})
export type Pagination = z.infer<typeof paginationSchema>
