import type { NetworkConfig, PaymentOutcome } from './config'
import { db } from './db/store'
import { realtimeServer } from './realtime'
import { runtime } from './runtime'
import { SCENARIOS, parseScenarioName, type ScenarioName } from './scenarios'
import { applyNftChange, type NftChange } from './services/catalog'
import { cancelPaymentTimers, settlePending } from './services/payments'

export interface KurioMockControl {
  scenario(): ScenarioName
  /** Persiste o cenário; cenários que mudam o seed (ex.: empty-catalog) só valem após recarregar. */
  setScenario(name: ScenarioName): void
  /** Restaura o seed do cenário (o atual, se omitido), derruba as conexões e cancela pagamentos agendados. */
  reset(name?: ScenarioName): Promise<void>
  network: { set(config: Partial<NetworkConfig>): void; get(): NetworkConfig }
  realtime: {
    updateNft(input: NftChange): void
    replayLast(nftId: string): void
    emitStale(nftId: string): void
    disconnect(): void
    pause(): void
    resume(): void
    isPaused(): boolean
    connections(): number
  }
  payments: {
    setOutcome(outcome: PaymentOutcome): void
    settle(outcome: 'confirm' | 'reject'): void
    setDelay(ms: number): void
    get(): { outcome: PaymentOutcome; delayMs: number }
  }
  panel: { show(): void; hide(): void }
}

function requireScenario(name: unknown): ScenarioName {
  const parsed = parseScenarioName(name)
  if (!parsed) throw new Error(`Cenário desconhecido: ${String(name)}`)
  return parsed
}

const PANEL_HIDDEN_KEY = 'kurio:mock-panel-hidden'

export const panelVisibility = {
  isHidden: () => localStorage.getItem(PANEL_HIDDEN_KEY) === '1',
  set(hidden: boolean) {
    if (hidden) localStorage.setItem(PANEL_HIDDEN_KEY, '1')
    else localStorage.removeItem(PANEL_HIDDEN_KEY)
    window.dispatchEvent(new Event('kurio:mock-panel'))
  },
}

export const mockControl: KurioMockControl = {
  scenario: () => runtime.get().scenario,
  setScenario: (name) => runtime.useScenario(requireScenario(name)),
  async reset(name) {
    const scenario = name === undefined ? runtime.get().scenario : requireScenario(name)
    cancelPaymentTimers()
    realtimeServer.resetHistory()
    runtime.useScenario(scenario)
    await db.reset(SCENARIOS[scenario].seed)
    realtimeServer.resume()
    realtimeServer.disconnect()
  },
  network: {
    set: (config) => runtime.setNetwork(config),
    get: () => structuredClone(runtime.get().network),
  },
  realtime: {
    updateNft: (input) => void applyNftChange(input),
    replayLast: realtimeServer.replayLast,
    emitStale: realtimeServer.emitStale,
    disconnect: realtimeServer.disconnect,
    pause: realtimeServer.pause,
    resume: realtimeServer.resume,
    isPaused: realtimeServer.isPaused,
    connections: realtimeServer.connectionCount,
  },
  payments: {
    setOutcome: (outcome) => runtime.setPaymentOutcome(outcome),
    settle: (outcome) => settlePending(outcome),
    setDelay: (ms) => runtime.setPaymentDelay(ms),
    get: () => ({ outcome: runtime.get().paymentOutcome, delayMs: runtime.get().paymentDelayMs }),
  },
  panel: {
    show: () => panelVisibility.set(false),
    hide: () => panelVisibility.set(true),
  },
}
