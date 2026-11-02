import { z } from 'zod'

/**
 * Só aceita caminho relativo do próprio app ("/carrinho?x=1"). "//evil.com", "/\\evil.com" e URLs
 * absolutas viram undefined: o redirect pós-login não pode virar open redirect.
 */
export function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return undefined
  if ([...value].some((char) => char.charCodeAt(0) < 32)) return undefined
  // Voltar para o próprio login depois de entrar seria um loop.
  if (/^\/(entrar|cadastro)(?=$|[/?#])/.test(value)) return undefined
  return value.slice(0, 2048)
}

export const authSearchSchema = z.object({
  redirect: z.unknown().transform(safeRedirect).optional().catch(undefined),
})

export type AuthSearch = z.infer<typeof authSearchSchema>
