import { createFileRoute } from '@tanstack/react-router'
import { ErrorState } from '@/components/common/ErrorState'
import { pageTitle } from '@/components/layout/page-title'
import { getErrorMessage } from '@/api/errors'
import { ProfileEditor, ProfileEditorSkeleton } from '@/features/profile/components/ProfileEditor'
import { useProfile } from '@/features/profile/hooks'

export const Route = createFileRoute('/perfil/')({
  head: () => ({ meta: [{ title: pageTitle('Dados do perfil') }] }),
  component: ProfileDataPage,
})

function ProfileDataPage() {
  const profile = useProfile()

  if (profile.isPending) return <ProfileEditorSkeleton />
  if (profile.isError) {
    return (
      <ErrorState
        title="Não foi possível carregar seu perfil"
        description={getErrorMessage(profile.error)}
        onRetry={() => void profile.refetch()}
        retrying={profile.isFetching}
      />
    )
  }
  return <ProfileEditor profile={profile.data} />
}
