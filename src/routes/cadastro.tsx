import { createFileRoute, redirect } from '@tanstack/react-router'
import { pageTitle } from '@/components/layout/page-title'
import { AUTH_COPY } from '@/features/auth/components/AuthParts'
import { AuthScreen } from '@/features/auth/components/AuthScreen'
import { authSearchSchema } from '@/features/auth/components/redirect'

export const Route = createFileRoute('/cadastro')({
  validateSearch: authSearchSchema,
  // Quem já está logado não tem o que fazer aqui; segue para o destino pedido.
  beforeLoad: async ({ context, search }) => {
    const session = await context.auth.whenReady()
    if (session.status === 'authenticated') throw redirect({ href: search.redirect ?? '/', replace: true })
  },
  head: () => ({ meta: [{ title: pageTitle(AUTH_COPY.register.documentTitle) }] }),
  component: RouteComponent,
})

function RouteComponent() {
  const { redirect: target } = Route.useSearch()
  return <AuthScreen mode="register" redirect={target} />
}
