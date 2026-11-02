import { useCallback, useMemo } from 'react'
import { z } from 'zod'
import { useSession } from '@/features/auth/session'
import { sessionStore } from '@/features/auth/session-store'
import { ensSuffixSchema, networkSchema, walletProviderSchema, type CollectorInfo, type Network } from '@/shared/contracts'
import { readStorage, removeStorage, writeStorage } from '@/shared/lib/storage'

/**
 * Rascunho do formulário de pagamento no sessionStorage, por usuário. Sobrevive a refresh e à
 * expiração da sessão (o usuário entra de novo e encontra o que digitou), mas não vaza para outra conta.
 */
const text = z.string().optional().catch(undefined)

const draftSchema = z.object({
  collector: z
    .object({
      displayName: text,
      username: text,
      network: networkSchema.optional().catch(undefined),
      profileName: text,
      walletAddress: text,
      ensOrSecondary: text,
      walletProvider: walletProviderSchema.optional().catch(undefined),
      referralCode: text,
      email: text,
      ensName: text,
      ensSuffix: ensSuffixSchema.optional().catch(undefined),
      useOtherWallet: z.boolean().optional().catch(undefined),
      note: text,
    })
    .catch({}),
  walletId: text,
  network: networkSchema.optional().catch(undefined),
})

export interface CheckoutDraft {
  collector: Partial<CollectorInfo>
  walletId?: string
  network?: Network
}

const storageName = (userId: string) => `checkoutDraft.${userId}`

export function clearCheckoutDraft() {
  const userId = sessionStore.getState().user?.id
  if (userId) removeStorage('session', storageName(userId))
}

export function useCheckoutDraft(): {
  draft: CheckoutDraft | null
  save(draft: CheckoutDraft): void
  clear(): void
} {
  const { user } = useSession()
  const userId = user?.id ?? null
  // Lido uma vez por usuário: serve de valor inicial do formulário, não de estado reativo.
  const draft = useMemo<CheckoutDraft | null>(
    () => (userId ? readStorage('session', storageName(userId), draftSchema) : null),
    [userId],
  )
  const save = useCallback(
    (next: CheckoutDraft) => {
      if (userId) writeStorage('session', storageName(userId), next)
    },
    [userId],
  )
  const clear = useCallback(() => {
    if (userId) removeStorage('session', storageName(userId))
  }, [userId])
  return { draft, save, clear }
}
