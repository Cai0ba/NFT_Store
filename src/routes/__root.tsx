import {
  createRootRouteWithContext,
  Link,
  Outlet,
  useRouter,
  useRouterState,
  type ErrorComponentProps,
} from '@tanstack/react-router'
import { Compass, RotateCw, TriangleAlert } from 'lucide-react'
import { useEffect, useLayoutEffect } from 'react'
import type { RouterContext } from '@/app/router'
import { DeferredRender } from '@/components/common/DeferredRender'
import { Footer } from '@/components/layout/Footer'
import { RealtimeStatusPill } from '@/components/layout/RealtimeStatusPill'
import { Header } from '@/components/layout/Header'
import { LiveAnnouncer } from '@/components/layout/LiveAnnouncer'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { MutationFeedback } from '@/components/layout/MutationFeedback'
import { DEFAULT_TITLE, pageTitle } from '@/components/layout/page-title'
import { isImmersiveOnMobile } from '@/components/layout/route-chrome'
import { SessionExpiryBanner } from '@/components/layout/SessionExpiryBanner'
import { SkipLink } from '@/components/layout/SkipLink'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/shared/lib/cn'

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({ meta: [{ title: DEFAULT_TITLE }] }),
  component: RootLayout,
  notFoundComponent: NotFoundPage,
  errorComponent: RootError,
})

/**
 * SPA sem SSR: o <title> estático do index.html vem antes no documento, então o título de cada
 * rota (definido em `head`) é aplicado direto em document.title.
 */
function DocumentTitle() {
  const title = useRouterState({
    select: (state) => {
      for (const match of [...state.matches].reverse()) {
        const entry = match.meta?.find((tag) => tag && 'title' in tag && tag.title)
        if (entry && 'title' in entry && entry.title) return String(entry.title)
      }
      return DEFAULT_TITLE
    },
  })
  // Layout effect: roda antes dos efeitos das páginas, que podem refinar o título (ex.: nome do NFT).
  useLayoutEffect(() => {
    document.title = title
  }, [title])
  return null
}

function RootLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const immersive = isImmersiveOnMobile(pathname)

  return (
    <TooltipProvider>
      <DocumentTitle />
      <SkipLink />
      <div
        className={cn('flex min-h-dvh flex-col', !immersive && 'max-md:pb-[calc(6rem+env(safe-area-inset-bottom))]')}
      >
        <div className="hidden md:block">
          <Header />
        </div>
        <SessionExpiryBanner />
        <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
          <Outlet />
        </main>
        {/* No mobile o Figma não desenha rodapé; nas telas com barra de ação própria ele sai de vez. */}
        <DeferredRender minHeight={640} className={cn(immersive && 'max-md:hidden')}>
          <Footer className={cn(immersive && 'max-md:hidden')} />
        </DeferredRender>
      </div>
      {immersive ? null : <MobileBottomNav />}
      <Toaster />
      <MutationFeedback />
      <LiveAnnouncer />
      <RealtimeStatusPill />
    </TooltipProvider>
  )
}

function NotFoundPage() {
  useEffect(() => {
    document.title = pageTitle('Página não encontrada')
  }, [])
  return (
    <section
      aria-labelledby="not-found-title"
      className="container-page flex flex-col items-center py-24 text-center md:py-32"
    >
      <p aria-hidden="true" className="text-text-accent text-[96px] leading-none font-bold md:text-[140px]">
        404
      </p>
      <h1
        id="not-found-title"
        className="text-foreground mt-6 text-2xl leading-8 font-bold uppercase md:text-[32px] md:leading-10"
      >
        Página não encontrada
      </h1>
      <p className="text-text-secondary mt-3 max-w-md text-sm leading-6">
        O endereço pode ter mudado ou nunca ter existido. Volte ao início para continuar explorando o mercado.
      </p>
      <Button asChild className="mt-8">
        <Link to="/">
          <Compass aria-hidden="true" />
          Voltar ao início
        </Link>
      </Button>
    </section>
  )
}

function RootError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  if (import.meta.env.DEV) console.error(error)

  return (
    <section role="alert" className="container-page flex flex-col items-center py-24 text-center">
      <span
        aria-hidden="true"
        className="bg-surface-raised text-danger flex size-14 items-center justify-center rounded-full"
      >
        <TriangleAlert className="size-7" />
      </span>
      <h1 className="text-foreground mt-6 text-2xl font-bold">Algo deu errado</h1>
      <p className="text-text-secondary mt-3 max-w-md text-sm leading-6">
        Não conseguimos exibir esta página. Seus dados estão preservados; tente de novo em instantes.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button
          onClick={() => {
            reset()
            void router.invalidate()
          }}
        >
          <RotateCw aria-hidden="true" />
          Tentar novamente
        </Button>
        <Button asChild variant="outline">
          <Link to="/">Voltar ao início</Link>
        </Button>
      </div>
    </section>
  )
}
