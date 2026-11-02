import { queryOptions, useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { addFavorite, getFavorites, removeFavorite } from '@/api/endpoints/favorites'
import { getErrorMessage } from '@/api/errors'
import { mutationKeys, queryKeys } from '@/api/query-keys'
import { STALE_TIME } from '@/app/query-client'
import { useSession } from '@/features/auth/session'
import type { FavoritesResponse } from '@/shared/contracts'
import { announce } from '@/shared/lib/announcer'

export function favoritesQueryOptions(userId: string) {
  return queryOptions({
    queryKey: queryKeys.me.favorites(userId),
    queryFn: ({ signal }) => getFavorites({ signal }),
    staleTime: STALE_TIME.private,
    refetchOnWindowFocus: true,
  })
}

export function useFavorites(): { ids: Set<string>; isLoading: boolean; isError: boolean; isEnabled: boolean } {
  const { user } = useSession()
  const query = useQuery({
    ...favoritesQueryOptions(user?.id ?? ''),
    enabled: Boolean(user),
  })
  const nftIds = query.data?.nftIds
  const ids = useMemo(() => new Set(nftIds ?? []), [nftIds])
  return { ids, isLoading: query.isLoading, isError: query.isError, isEnabled: Boolean(user) }
}

interface ToggleVariables {
  nftId: string
  nextValue: boolean
  label?: string
}

function withFavorite(data: FavoritesResponse | undefined, nftId: string, value: boolean) {
  if (!data) return data
  const without = data.nftIds.filter((id) => id !== nftId)
  return { nftIds: value ? [...without, nftId] : without }
}

/**
 * Atualização otimista. O rollback desfaz só o item que falhou (não restaura um snapshot inteiro),
 * para não apagar outro favorito alterado em paralelo.
 */
export function useToggleFavorite(): {
  toggle(nftId: string, nextValue: boolean, label?: string): void
  isPending(nftId: string): boolean
} {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const userId = user?.id ?? null
  const mutationKey = mutationKeys.favorites(userId ?? 'anonymous')

  const { mutate } = useMutation({
    mutationKey,
    mutationFn: ({ nftId, nextValue }: ToggleVariables) => (nextValue ? addFavorite(nftId) : removeFavorite(nftId)),
    onMutate: async ({ nftId, nextValue }) => {
      if (!userId) return null
      const queryKey = queryKeys.me.favorites(userId)
      await queryClient.cancelQueries({ queryKey })
      queryClient.setQueryData<FavoritesResponse>(queryKey, (old) => withFavorite(old, nftId, nextValue))
      return { queryKey }
    },
    onError: (error, { nftId, nextValue, label }, context) => {
      if (context) queryClient.setQueryData<FavoritesResponse>(context.queryKey, (old) => withFavorite(old, nftId, !nextValue))
      const subject = label ? `${label}: ` : ''
      const action = nextValue ? 'não foi possível favoritar' : 'não foi possível remover dos favoritos'
      announce(`${subject}${action}. ${getErrorMessage(error)}`, 'assertive')
    },
    onSuccess: (_data, { nextValue, label }) => {
      const subject = label ?? 'NFT'
      announce(nextValue ? `${subject} adicionado aos favoritos.` : `${subject} removido dos favoritos.`)
    },
    onSettled: (_data, _error, _variables, context) => {
      // Só reconcilia quando a última mutation termina; antes disso o refetch desfaria otimismos em voo.
      if (context && queryClient.isMutating({ mutationKey }) === 1) {
        void queryClient.invalidateQueries({ queryKey: context.queryKey })
      }
    },
  })

  const pendingIds = useMutationState({
    filters: { mutationKey, status: 'pending' },
    select: (mutation) => (mutation.state.variables as ToggleVariables | undefined)?.nftId,
  })

  const isPending = useCallback((nftId: string) => pendingIds.includes(nftId), [pendingIds])

  // Um clique enquanto o anterior está em voo poderia chegar fora de ordem ao servidor.
  const toggle = useCallback(
    (nftId: string, nextValue: boolean, label?: string) => {
      if (!userId || isPending(nftId)) return
      mutate({ nftId, nextValue, label })
    },
    [isPending, mutate, userId],
  )

  return { toggle, isPending }
}
