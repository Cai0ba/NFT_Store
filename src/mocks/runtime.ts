import { z } from 'zod'
import { networkConfigSchema, paymentOutcomeSchema, type NetworkConfig, type PaymentOutcome } from './config'
import { SCENARIOS, scenarioFromEnv, scenarioNameSchema, takeScenarioFromUrl, type ScenarioName } from './scenarios'

const STORAGE_KEY = 'kurio:mock-runtime:v1'

const runtimeSchema = z.object({
  scenario: scenarioNameSchema,
  network: networkConfigSchema,
  paymentOutcome: paymentOutcomeSchema,
  paymentDelayMs: z.number().int().min(0),
})
export type RuntimeConfig = z.infer<typeof runtimeSchema>

function fromScenario(name: ScenarioName): RuntimeConfig {
  const definition = SCENARIOS[name]
  return {
    scenario: name,
    network: structuredClone(definition.network),
    paymentOutcome: definition.payment.outcome,
    paymentDelayMs: definition.payment.delayMs,
  }
}

function loadStored(): RuntimeConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = runtimeSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

let current: RuntimeConfig = fromScenario('default')
const listeners = new Set<(config: RuntimeConfig) => void>()

function save(next: RuntimeConfig) {
  current = next
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  listeners.forEach((listener) => listener(next))
}

export const runtime = {
  /** Precedência: `?scenario=` > configuração salva > `VITE_MOCK_SCENARIO`. */
  init() {
    const requested = takeScenarioFromUrl()
    const stored = loadStored()
    if (requested) save(stored?.scenario === requested ? stored : fromScenario(requested))
    else save(stored ?? fromScenario(scenarioFromEnv()))
    return current
  },
  get: () => current,
  scenario: () => SCENARIOS[current.scenario],
  useScenario(name: ScenarioName) {
    save(fromScenario(name))
  },
  setNetwork(patch: Partial<NetworkConfig>) {
    save({ ...current, network: networkConfigSchema.parse({ ...current.network, ...patch }) })
  },
  setPaymentOutcome(outcome: PaymentOutcome) {
    save({ ...current, paymentOutcome: outcome })
  },
  setPaymentDelay(ms: number) {
    save({ ...current, paymentDelayMs: Math.max(0, Math.round(ms)) })
  },
  subscribe(listener: (config: RuntimeConfig) => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
