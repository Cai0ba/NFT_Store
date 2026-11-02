import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as profileApi from '@/api/endpoints/profile'
import { queryKeys } from '@/api/query-keys'
import { STALE_TIME } from '@/app/query-client'
import { useSession } from '@/features/auth/session'
import { sessionStore, updateSessionUser } from '@/features/auth/session-store'
import type { ChangePasswordRequest, Profile, UpdateProfileRequest } from '@/shared/contracts'
import { announce } from '@/shared/lib/announcer'

export { AvatarFileError, fileToAvatarDataUrl } from './avatar'

export function profileQueryOptions(userId: string) {
  return queryOptions({
    queryKey: queryKeys.me.profile(userId),
    queryFn: ({ signal }) => profileApi.getProfile({ signal }),
    staleTime: STALE_TIME.private,
    refetchOnWindowFocus: true,
  })
}

export function useProfile() {
  const { user } = useSession()
  return useQuery({ ...profileQueryOptions(user?.id ?? ''), enabled: Boolean(user) })
}

/** Grava o perfil devolvido pelo servidor e espelha nome/avatar na sessão (cabeçalho, menu). */
function useProfileMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Profile>, successMessage: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onMutate: () => ({ userId: sessionStore.getState().user?.id ?? null }),
    onSuccess: (profile, _variables, context) => {
      if (!context.userId || context.userId !== sessionStore.getState().user?.id) return
      queryClient.setQueryData(queryKeys.me.profile(context.userId), profile)
      updateSessionUser({
        displayName: profile.displayName,
        username: profile.username,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
      })
      announce(successMessage)
    },
  })
}

export function useUpdateProfile() {
  return useProfileMutation((body: UpdateProfileRequest) => profileApi.updateProfile(body), 'Perfil atualizado.')
}

/** Recebe o data URL já preparado por `fileToAvatarDataUrl`. */
export function useUpdateAvatar() {
  return useProfileMutation((dataUrl: string) => profileApi.updateAvatar({ dataUrl }), 'Foto de perfil atualizada.')
}

export function useRemoveAvatar() {
  return useProfileMutation((_variables: void) => profileApi.removeAvatar(), 'Foto de perfil removida.')
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: ChangePasswordRequest) => profileApi.changePassword(body),
    onSuccess: () => announce('Senha alterada.'),
  })
}
