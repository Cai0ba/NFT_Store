import { z } from 'zod'

export const SCENARIO_NAMES = [
  'default',
  'empty-catalog',
  'slow-network',
  'variable-latency',
  'offline',
  'server-error',
  'favorites-failure',
  'session-expiring',
  'price-change-on-checkout',
  'sold-out-on-checkout',
  'order-timeout',
  'payment-rejected',
  'wallet-rejects',
] as const

export const scenarioNameSchema = z.enum(SCENARIO_NAMES)
export type ScenarioName = z.infer<typeof scenarioNameSchema>
