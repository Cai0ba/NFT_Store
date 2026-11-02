import { z } from 'zod'
import { apiErrorCodeSchema } from '@/shared/contracts'

export const latencyProfileSchema = z.enum(['none', 'fast', 'slow', 'variable'])
export type LatencyProfile = z.infer<typeof latencyProfileSchema>

const ruleBase = z.object({
  /** Método HTTP em maiúsculas; ausente = qualquer método. */
  method: z.string().toUpperCase().optional(),
  /** Caminho com `:param` (um segmento) e `*` (qualquer sufixo), ex.: `/api/nfts/:id`. */
  path: z.string(),
  /** Quantas vezes a regra se aplica; ausente = sempre. */
  times: z.number().int().min(1).optional(),
  /** Conta `times` separadamente para cada URL (caminho + query). */
  perUrl: z.boolean().optional(),
})

export const networkRuleSchema = z.discriminatedUnion('effect', [
  ruleBase.extend({
    effect: z.literal('status'),
    status: z.number().int().min(400).max(599),
    code: apiErrorCodeSchema.optional(),
  }),
  ruleBase.extend({ effect: z.literal('offline') }),
  ruleBase.extend({ effect: z.literal('delay'), delayMs: z.number().int().min(0) }),
])
export type NetworkRule = z.infer<typeof networkRuleSchema>

export const networkConfigSchema = z.object({
  latency: latencyProfileSchema,
  offline: z.boolean(),
  rules: z.array(networkRuleSchema),
})
export type NetworkConfig = z.infer<typeof networkConfigSchema>

export const paymentOutcomeSchema = z.enum(['confirm', 'reject', 'hold'])
export type PaymentOutcome = z.infer<typeof paymentOutcomeSchema>
