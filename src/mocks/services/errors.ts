import type { z } from 'zod'
import ptBR from 'zod/v4/locales/pt-BR.js'
import type { ApiErrorCode } from '@/shared/contracts'

type FieldErrors = Record<string, string>

/** Erro de domínio do servidor simulado; o wrapper de rotas converte no envelope `{ error }`. */
export class MockApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly fieldErrors?: FieldErrors
  readonly details?: unknown

  constructor(status: number, code: ApiErrorCode, message: string, extra: { fieldErrors?: FieldErrors; details?: unknown } = {}) {
    super(message)
    this.name = 'MockApiError'
    this.status = status
    this.code = code
    this.fieldErrors = extra.fieldErrors
    this.details = extra.details
  }
}

export const fail = {
  validation: (fieldErrors: FieldErrors, message = 'Revise os campos destacados.') =>
    new MockApiError(422, 'VALIDATION_ERROR', message, { fieldErrors }),
  unauthenticated: () => new MockApiError(401, 'UNAUTHENTICATED', 'Faça login para continuar.'),
  sessionExpired: () => new MockApiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.'),
  forbidden: (message = 'Você não tem permissão para acessar este recurso.') => new MockApiError(403, 'FORBIDDEN', message),
  notFound: (message: string) => new MockApiError(404, 'NOT_FOUND', message),
  conflict: (code: ApiErrorCode, message: string, extra: { fieldErrors?: FieldErrors; details?: unknown } = {}) =>
    new MockApiError(409, code, message, extra),
}

export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.map(String).join('.') : 'form'
    result[key] ??= issue.message
  }
  return result
}

const { localeError } = ptBR()

/** Só cobre campos sem mensagem própria no contrato (enums, tipos); as mensagens dos schemas têm precedência. */
const errorMap: z.core.$ZodErrorMap = (issue) =>
  issue.code === 'invalid_type' && issue.input === undefined ? 'Campo obrigatório' : localeError(issue)

export function parseOrFail<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const parsed = schema.safeParse(input, { error: errorMap })
  if (!parsed.success) throw fail.validation(fieldErrorsFrom(parsed.error))
  return parsed.data
}
