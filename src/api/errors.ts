import { isAxiosError, isCancel } from 'axios'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { apiErrorBodySchema, type ApiErrorCode } from '@/shared/contracts'

export type ClientErrorCode = 'NETWORK_ERROR' | 'TIMEOUT'
export type AnyApiErrorCode = ApiErrorCode | ClientErrorCode

interface ApiErrorInit {
  status: number
  code: AnyApiErrorCode
  message: string
  fieldErrors?: Record<string, string>
  details?: unknown
  cause?: unknown
}

/** Erro normalizado de toda chamada REST. `status` 0 indica que não houve rsposta HTTP. */
export class ApiError extends Error {
  readonly status: number
  readonly code: AnyApiErrorCode
  readonly fieldErrors?: Record<string, string>
  readonly details?: unknown

  constructor({ status, code, message, fieldErrors, details, cause }: ApiErrorInit) {
    super(message, { cause })
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.details = details
  }

  get isTransient() {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT' || this.status >= 500
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function hasErrorCode(error: unknown, ...codes: AnyApiErrorCode[]): error is ApiError {
  return isApiError(error) && codes.includes(error.code)
}

export function isTransientError(error: unknown) {
  return isApiError(error) && error.isTransient
}

/**
 * Converte qualquer falha do Axios em ApiError. Cancelamentos são devolvidos intactos: quem
 * cancelou (TanStack Query ou um AbortController) já sabe lidar com eles e não devem virar erro de UI.
 */
export function toApiError(error: unknown): unknown {
  if (isApiError(error) || isCancel(error)) return error
  if (!isAxiosError(error)) {
    return new ApiError({ status: 0, code: 'INTERNAL_ERROR', message: 'Erro inesperado', cause: error })
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ApiError({ status: 0, code: 'TIMEOUT', message: 'Tempo de resposta esgotado', cause: error })
  }
  if (!error.response) {
    return new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Falha de conexão', cause: error })
  }

  const { status, data } = error.response
  const body = apiErrorBodySchema.safeParse(data)
  if (body.success) {
    const { code, message, fieldErrors, details } = body.data.error
    return new ApiError({ status, code, message, fieldErrors, details, cause: error })
  }
  return new ApiError({
    status,
    code: status === 503 ? 'SERVICE_UNAVAILABLE' : status >= 500 ? 'INTERNAL_ERROR' : fallbackCodeFor(status),
    message: error.message,
    cause: error,
  })
}

function fallbackCodeFor(status: number): ApiErrorCode {
  switch (status) {
    case 401:
      return 'UNAUTHENTICATED'
    case 403:
      return 'FORBIDDEN'
    case 404:
      return 'NOT_FOUND'
    case 409:
      return 'CONFLICT'
    case 422:
      return 'VALIDATION_ERROR'
    default:
      return 'INTERNAL_ERROR'
  }
}

const FRIENDLY_MESSAGES: Record<AnyApiErrorCode, string> = {
  NETWORK_ERROR: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
  TIMEOUT: 'O servidor demorou para responder. Tente novamente em instantes.',
  VALIDATION_ERROR: 'Alguns dados estão inválidos. Revise os campos destacados.',
  UNAUTHENTICATED: 'Entre na sua conta para continuar.',
  SESSION_EXPIRED: 'Sua sessão expirou. Entre novamente para continuar.',
  FORBIDDEN: 'Você não tem permissão para acessar este conteúdo.',
  NOT_FOUND: 'Não encontramos o que você procurava.',
  CONFLICT: 'Não foi possível concluir porque os dados mudaram. Atualize e tente de novo.',
  EMAIL_TAKEN: 'Este e-mail já está em uso.',
  USERNAME_TAKEN: 'Este nome de usuário já está em uso.',
  AVAILABILITY_CONFLICT: 'A quantidade pedida não está mais disponível.',
  EDITION_UNAVAILABLE: 'Esta edição está esgotada.',
  QUOTE_OUTDATED: 'Os valores do pedido mudaram. Revise antes de confirmar.',
  IDEMPOTENCY_CONFLICT: 'Este pedido já foi enviado com outros dados. Confirme novamente para gerar um novo envio.',
  COUPON_INVALID: 'Cupom inválido.',
  COUPON_EXPIRED: 'Este cupom expirou.',
  WALLET_REJECTED: 'A conexão foi recusada na carteira.',
  WALLET_NOT_CONNECTED: 'Conecte a carteira na rede escolhida antes de confirmar.',
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos.',
  INVALID_PASSWORD: 'A senha atual está incorreta.',
  SERVICE_UNAVAILABLE: 'Serviço temporariamente indisponível. Tente novamente.',
  INTERNAL_ERROR: 'Algo deu errado do nosso lado. Tente novamente.',
}

// Nestes códigos o servidor descreve o caso concreto (ex.: "restam 2 unidades"), mais útil que o genérico.
const CONTEXTUAL_CODES = new Set<AnyApiErrorCode>(['AVAILABILITY_CONFLICT', 'EDITION_UNAVAILABLE', 'CONFLICT'])

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (CONTEXTUAL_CODES.has(error.code) && error.message) return error.message
    return FRIENDLY_MESSAGES[error.code]
  }
  return FRIENDLY_MESSAGES.INTERNAL_ERROR
}

/**
 * Leva os `fieldErrors` da API para o react-hook-form. Retorna `true` se algum campo foi marcado,
 * para a UI decidir se ainda precisa de uma mensagem geral.
 */
export function applyFieldErrors<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
  fields?: readonly Path<TFieldValues>[],
): boolean {
  if (!isApiError(error) || !error.fieldErrors) return false
  const entries = Object.entries(error.fieldErrors).filter(
    ([name]) => !fields || fields.includes(name as Path<TFieldValues>),
  )
  entries.forEach(([name, message], index) => {
    setError(name as Path<TFieldValues>, { type: 'server', message }, { shouldFocus: index === 0 })
  })
  return entries.length > 0
}
