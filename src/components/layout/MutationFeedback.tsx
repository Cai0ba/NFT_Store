import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/errors'

/**
 * O toggle de favorito é otimista e o rollback volta o coração sozinho; sem um aviso visual o usuário
 * acharia que o clique falhou em silêncio. Um só ouvinte no layout evita toasts duplicados quando o
 * mesmo NFT aparece em mais de um lugar da tela.
 */
export function MutationFeedback() {
  const queryClient = useQueryClient()

  useEffect(
    () =>
      queryClient.getMutationCache().subscribe((event) => {
        if (event.type !== 'updated' || event.action.type !== 'error') return
        if (event.mutation.options.mutationKey?.[0] !== 'favorites') return
        const nextValue = (event.mutation.state.variables as { nextValue?: boolean } | undefined)?.nextValue
        toast.error(nextValue === false ? 'Não foi possível remover dos favoritos' : 'Não foi possível favoritar', {
          description: `${getErrorMessage(event.action.error)} O estado anterior foi restaurado.`,
        })
      }),
    [queryClient],
  )

  return null
}
