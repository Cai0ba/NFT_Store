import axios, { AxiosHeaders } from 'axios'
import type { z } from 'zod'
import { EXPIRY_REASON, expireSession, getAuthToken, sessionStore } from '@/features/auth/session-store'
import { getOrCreateGuestCartId } from '@/features/cart/guest-cart'
import { CART_ID_HEADER } from '@/shared/contracts'
import { env } from '@/shared/config/env'
import { ApiError, toApiError } from './errors'

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Envia X-Cart-Id quando não há sessão (rotas de carrinho). */
    guestCart?: boolean
    /** O 401 desta chamada é tratado por quem chamou (login, validação de boot), sem expirar a sessão. */
    skipSessionExpiry?: boolean
  }
}

export const DEFAULT_TIMEOUT_MS = 10_000
export const ORDER_TIMEOUT_MS = 8_000

export const http = axios.create({
  baseURL: env.apiUrl,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { Accept: 'application/json' },
  // Arrays como parâmetros repetidos (?category=a&category=b), como o contrato do catálogo espera.
  paramsSerializer: { indexes: null },
})

http.interceptors.request.use((config) => {
  const headers = AxiosHeaders.from(config.headers)
  const token = getAuthToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  else if (config.guestCart) headers.set(CART_ID_HEADER, getOrCreateGuestCartId())
  config.headers = headers
  return config
})

const EXPIRY_REASONS: Partial<Record<ApiError['code'], string>> = {
  SESSION_EXPIRED: EXPIRY_REASON.expired,
  UNAUTHENTICATED: EXPIRY_REASON.invalid,
}

http.interceptors.response.use(undefined, (error: unknown) => {
  const normalized = toApiError(error)
  if (normalized instanceof ApiError && normalized.status === 401 && axios.isAxiosError(error)) {
    handleUnauthorized(normalized, error.config)
  }
  return Promise.reject(normalized)
})

function handleUnauthorized(error: ApiError, config: { headers?: unknown; skipSessionExpiry?: boolean } | undefined) {
  const reason = EXPIRY_REASONS[error.code]
  if (!reason || config?.skipSessionExpiry) return
  const { token, status } = sessionStore.getState()
  if (!token || status === 'anonymous') return
  // Uma resposta atrasada com o token de uma sessão anterior não pode derrubar a sessão atual.
  const sentAuth = AxiosHeaders.from(config?.headers as AxiosHeaders | undefined).get('Authorization')
  if (sentAuth !== `Bearer ${token}`) return
  expireSession(reason)
}

/** Valida o corpo com o contrato; divergência vira erro tratável em vez de dado corrompido na UI. */
export function parseResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (result.success) return result.data
  if (env.isDev) console.error('[api] resposta fora do contrato', result.error.issues)
  throw new ApiError({
    status: 0,
    code: 'INTERNAL_ERROR',
    message: 'Resposta inesperada do servidor',
    cause: result.error,
  })
}

export interface RequestOptions {
  signal?: AbortSignal
}
