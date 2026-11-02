import { env } from '@/shared/config/env'
import type { NetworkConfig, NetworkRule, PaymentOutcome } from './config'
import type { SeedKind } from './db/schema'
import { SCENARIO_NAMES, scenarioNameSchema, type ScenarioName } from './scenario-names'

export { SCENARIO_NAMES, scenarioNameSchema, type ScenarioName }

export interface ScenarioDefinition {
  label: string
  description: string
  seed: SeedKind
  network: NetworkConfig
  sessionTtlMs: number
  payment: { outcome: PaymentOutcome; delayMs: number }
  /** Alteração aplicada no servidor na primeira tentativa de criar pedido, antes de validar a cotação. */
  checkoutTwist: 'price-increase' | 'sell-out' | null
  walletRejectsOnce: boolean
  /** Atraso da resposta de um pedido recém-criado (o pedido já existe quando o cliente desiste). */
  orderResponseDelayMs: number
}

export const DEFAULT_SESSION_TTL_MS = 30 * 60 * 1000
export const DEFAULT_PAYMENT_DELAY_MS = 2500

const API = env.apiUrl.replace(/\/$/, '')

const transientFailure = (path: string): NetworkRule => ({
  method: 'GET',
  path: `${API}${path}`,
  effect: 'status',
  status: 503,
  code: 'SERVICE_UNAVAILABLE',
  times: 1,
  perUrl: true,
})

const base: ScenarioDefinition = {
  label: 'Padrão',
  description: 'Dados completos, latência curta e pagamento confirmado.',
  seed: 'full',
  network: { latency: 'fast', offline: false, rules: [] },
  sessionTtlMs: DEFAULT_SESSION_TTL_MS,
  payment: { outcome: 'confirm', delayMs: DEFAULT_PAYMENT_DELAY_MS },
  checkoutTwist: null,
  walletRejectsOnce: false,
  orderResponseDelayMs: 0,
}

const withNetwork = (network: Partial<NetworkConfig>) => ({ network: { ...base.network, ...network } })

export const SCENARIOS: Record<ScenarioName, ScenarioDefinition> = {
  default: base,
  'empty-catalog': {
    ...base,
    label: 'Catálogo vazio',
    description: 'Nenhum NFT cadastrado: exercita os estados vazios.',
    seed: 'empty-catalog',
  },
  'slow-network': {
    ...base,
    ...withNetwork({ latency: 'slow' }),
    label: 'Rede lenta',
    description: 'Toda resposta leva entre 1,5 s e 2,5 s.',
  },
  'variable-latency': {
    ...base,
    ...withNetwork({ latency: 'variable' }),
    label: 'Latência variável',
    description: 'Latência pseudoaleatória por URL: respostas chegam fora de ordem de forma reprodutível.',
  },
  offline: {
    ...base,
    ...withNetwork({ offline: true }),
    label: 'Sem conexão',
    description: 'Toda chamada falha com erro de rede e o tempo real recusa conexões.',
  },
  'server-error': {
    ...base,
    ...withNetwork({
      rules: [transientFailure('/nfts'), transientFailure('/nfts/:id'), transientFailure('/me/favorites')],
    }),
    label: 'Falha transitória',
    description: 'Catálogo, detalhe e favoritos respondem 503 na primeira tentativa de cada URL.',
  },
  'favorites-failure': {
    ...base,
    ...withNetwork({
      rules: ['PUT', 'DELETE'].map<NetworkRule>((method) => ({
        method,
        path: `${API}/me/favorites/:nftId`,
        effect: 'status',
        status: 503,
        code: 'SERVICE_UNAVAILABLE',
      })),
    }),
    label: 'Favoritos indisponíveis',
    description: 'Adicionar ou remover favoritos sempre falha com 503.',
  },
  'session-expiring': {
    ...base,
    label: 'Sessão curta',
    description: 'Sessões expiram 20 s após o login.',
    sessionTtlMs: 20_000,
  },
  'price-change-on-checkout': {
    ...base,
    label: 'Preço muda no checkout',
    description: 'Na primeira tentativa de pedido o preço do primeiro item sobe 10%.',
    checkoutTwist: 'price-increase',
  },
  'sold-out-on-checkout': {
    ...base,
    label: 'Esgota no checkout',
    description: 'Na primeira tentativa de pedido a edição do primeiro item esgota.',
    checkoutTwist: 'sell-out',
  },
  'order-timeout': {
    ...base,
    label: 'Timeout do pedido',
    description: 'O pedido é criado, mas a resposta leva 15 s (acima do timeout do cliente).',
    orderResponseDelayMs: 15_000,
  },
  'payment-rejected': {
    ...base,
    label: 'Pagamento recusado',
    description: 'A carteira recusa o pagamento após o pedido ficar pendente.',
    payment: { outcome: 'reject', delayMs: DEFAULT_PAYMENT_DELAY_MS },
  },
  'wallet-rejects': {
    ...base,
    label: 'Carteira recusa conexão',
    description: 'A primeira tentativa de conectar a carteira é recusada.',
    walletRejectsOnce: true,
  },
}

export const SCENARIO_QUERY_PARAM = 'scenario'

export function parseScenarioName(value: unknown): ScenarioName | null {
  const parsed = scenarioNameSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

/** Cenário pedido pela URL; o parâmetro é removido para não vazar para o roteador da aplicação. */
export function takeScenarioFromUrl(): ScenarioName | null {
  const url = new URL(window.location.href)
  const raw = url.searchParams.get(SCENARIO_QUERY_PARAM)
  if (raw === null) return null
  url.searchParams.delete(SCENARIO_QUERY_PARAM)
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  const name = parseScenarioName(raw)
  if (!name) console.warn(`[mocks] Cenário desconhecido "${raw}". Disponíveis: ${SCENARIO_NAMES.join(', ')}`)
  return name
}

export function scenarioFromEnv(): ScenarioName {
  return parseScenarioName(env.mockScenario) ?? 'default'
}
