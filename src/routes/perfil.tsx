import { createFileRoute, Outlet } from '@tanstack/react-router'
import { MobileScreenHeader } from '@/components/layout/MobileScreenHeader'
import { pageTitle } from '@/components/layout/page-title'
import { requireAuth } from '@/features/auth/guard'
import { ProfileNav } from '@/features/profile/components/ProfileNav'

export const Route = createFileRoute('/perfil')({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: pageTitle('Meu perfil') }] }),
  component: ProfileLayout,
})

function ProfileLayout() {
  return (
    <div className="container-page pt-4 pb-16 md:pt-8 md:pb-24 lg:pt-[33px]">
      <MobileScreenHeader title="Meu perfil" backTo="/" />
      <h1 className="sr-only hidden md:block">Meu perfil</h1>
      <div className="mt-5 md:mt-0 lg:grid lg:grid-cols-[310px_minmax(0,1fr)] lg:items-start lg:gap-[29px]">
        <ProfileNav />
        <div className="mt-6 min-w-0 lg:mt-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
