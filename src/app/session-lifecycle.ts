import type { QueryClient } from '@tanstack/react-query'
import { PRIVATE_QUERY_ROOTS } from '@/api/query-keys'
import { sessionStore } from '@/features/auth/session-store'

interface Invalidatable {
  invalidate(): Promise<void>
}

/**
 * Efeitos da troca de sessão sobre o cache e as rotas:
 * - mudou o usuário (logout, expiração, outro login, outra aba): cancela e remove tudo que é privado,
 *   inclusive o estado de mutations, para nada do usuário anterior aparecer nem ser reaplicado;
 * - a sessão expirou: reavalia os guards da rota atual, que levam ao login com `redirect` de volta.
 */
export function bindSessionLifecycle(queryClient: QueryClient, router: Invalidatable) {
  return sessionStore.subscribe((next, prev) => {
    if (next.user?.id !== prev.user?.id) {
      for (const queryKey of PRIVATE_QUERY_ROOTS) {
        void queryClient.cancelQueries({ queryKey })
        queryClient.removeQueries({ queryKey })
      }
      queryClient.getMutationCache().clear()
    }
    if (next.expiry && !prev.expiry) void router.invalidate()
  })
}
