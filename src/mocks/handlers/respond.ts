import { HttpResponse } from 'msw'
import type { z } from 'zod'
import { env } from '@/shared/config/env'
import type { ApiErrorBody, ApiErrorCode } from '@/shared/contracts'

export function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  extra: { fieldErrors?: Record<string, string>; details?: unknown } = {},
) {
  const body: ApiErrorBody = { error: { code, message, ...extra } }
  return HttpResponse.json(body, { status })
}

/**
 * Em desenvolvimento cada resposta é validada contra o contrato: um shape errado no mock
 * vira 500 visível em vez de um bug silencioso na interface.
 */
export function jsonResponse<S extends z.ZodType>(schema: S, data: z.infer<S>, status = 200) {
  if (env.isDev) {
    const parsed = schema.safeParse(data)
    if (!parsed.success) {
      console.error('[mocks] Resposta fora do contrato', parsed.error.issues, data)
      return errorResponse(500, 'INTERNAL_ERROR', 'Resposta do servidor simulado fora do contrato.')
    }
  }
  return HttpResponse.json(data as object, { status })
}

export const noContent = () => new HttpResponse(null, { status: 204 })
