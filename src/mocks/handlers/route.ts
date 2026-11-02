import { http, type HttpResponseResolver, type PathParams } from 'msw'
import { env } from '@/shared/config/env'
import { simulateNetwork } from '../network'
import { fail, MockApiError } from '../services/errors'
import { errorResponse } from './respond'

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

export interface RouteContext {
  request: Request
  params: Record<string, string>
  url: URL
}

type RouteResolver = (context: RouteContext) => Response | Promise<Response>

const API_BASE = env.apiUrl.replace(/\/$/, '')

function flattenParams(params: PathParams): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, decodeURIComponent(Array.isArray(value) ? (value[0] ?? '') : String(value ?? ''))]),
  )
}

function toErrorResponse(error: unknown) {
  if (error instanceof MockApiError) {
    return errorResponse(error.status, error.code, error.message, {
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      ...(error.details !== undefined ? { details: error.details } : {}),
    })
  }
  console.error('[mocks] Falha inesperada no handler', error)
  return errorResponse(500, 'INTERNAL_ERROR', 'Erro inesperado no servidor. Tente novamente.')
}

/**
 * Toda rota passa por aqui: primeiro a simulação de rede do cenário ativo (latência, offline,
 * falhas HTTP), depois o handler, e por fim a conversão de erros de domínio no envelope do contrato.
 */
export function route(method: Method, path: string, resolver: RouteResolver) {
  const handle: HttpResponseResolver = async ({ request, params }) => {
    const simulated = await simulateNetwork(request)
    if (simulated) return simulated
    try {
      return await resolver({ request, params: flattenParams(params), url: new URL(request.url) })
    } catch (error) {
      return toErrorResponse(error)
    }
  }
  return http[method](`${API_BASE}${path}`, handle)
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw fail.validation({ form: 'Corpo da requisição ausente ou inválido' }, 'Corpo da requisição inválido.')
  }
}
