import { delay, HttpResponse } from 'msw'
import type { ApiErrorCode } from '@/shared/contracts'
import type { LatencyProfile, NetworkRule } from './config'
import { fnv1a } from './lib/hash'
import { createPrng } from './lib/prng'
import { errorResponse } from './handlers/respond'
import { runtime } from './runtime'

const LATENCY_RANGE: Record<LatencyProfile, readonly [number, number]> = {
  none: [0, 0],
  fast: [30, 90],
  slow: [1500, 2500],
  variable: [80, 1600],
}

const DEFAULT_CODE: Record<number, ApiErrorCode> = {
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
}

const ruleHits = new Map<string, number>()
const urlHits = new Map<string, number>()
const patternCache = new Map<string, RegExp>()

export function resetNetworkCounters() {
  ruleHits.clear()
  urlHits.clear()
}

runtime.subscribe(resetNetworkCounters)

function compile(path: string) {
  let regex = patternCache.get(path)
  if (!regex) {
    const source = path
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/:[A-Za-z_]\w*/g, '[^/]+'))
      .join('.*')
    regex = new RegExp(`^${source}/?$`)
    patternCache.set(path, regex)
  }
  return regex
}

function matchRule(rule: NetworkRule, index: number, method: string, url: URL) {
  if (rule.method && rule.method !== method) return false
  if (!compile(rule.path).test(url.pathname)) return false
  if (rule.times === undefined) return true
  const key = `${index}|${rule.perUrl ? `${method} ${url.pathname}${url.search}` : ''}`
  const hits = ruleHits.get(key) ?? 0
  if (hits >= rule.times) return false
  ruleHits.set(key, hits + 1)
  return true
}

/** A semente combina método, URL e o número da chamada: a mesma sequência de requisições repete as mesmas latências. */
function latencyFor(profile: LatencyProfile, method: string, url: URL) {
  const [min, max] = LATENCY_RANGE[profile]
  if (max === 0) return 0
  const key = `${method} ${url.pathname}${url.search}`
  const count = (urlHits.get(key) ?? 0) + 1
  urlHits.set(key, count)
  return createPrng(fnv1a(`${key}#${count}`)).int(min, max)
}

function ruleResponse(rule: NetworkRule): Response | null {
  if (rule.effect === 'offline') return HttpResponse.error()
  if (rule.effect === 'status') {
    const code = rule.code ?? DEFAULT_CODE[rule.status] ?? (rule.status >= 500 ? 'SERVICE_UNAVAILABLE' : 'VALIDATION_ERROR')
    const message =
      rule.status >= 500 ? 'Serviço temporariamente indisponível. Tente novamente em instantes.' : 'Falha simulada na requisição.'
    return errorResponse(rule.status, code, message)
  }
  return null
}

/**
 * Aplica a condição de rede ativa a uma requisição. Devolve uma resposta quando a rede
 * "decide" o resultado (offline, erro HTTP); caso contrário espera a latência e devolve null.
 */
export async function simulateNetwork(request: Request): Promise<Response | null> {
  const config = runtime.get().network
  const method = request.method.toUpperCase()
  const url = new URL(request.url)

  await delay(latencyFor(config.latency, method, url))
  if (config.offline) return HttpResponse.error()

  for (const [index, rule] of config.rules.entries()) {
    if (!matchRule(rule, index, method, url)) continue
    if (rule.effect === 'delay') {
      await delay(rule.delayMs)
      continue
    }
    return ruleResponse(rule)
  }
  return null
}

export const isOffline = () => runtime.get().network.offline
