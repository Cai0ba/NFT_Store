import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { RealtimeProvider } from '@/features/realtime/provider'
import { env } from '@/shared/config/env'
import { queryClient } from './query-client'
import { router } from './router'

const QueryDevtools = env.isDev
  ? lazy(() => import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })))
  : null
const RouterDevtools = env.isDev
  ? lazy(() => import('@tanstack/react-router-devtools').then((m) => ({ default: m.TanStackRouterDevtools })))
  : null

export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>
        <RouterProvider router={router} />
      </RealtimeProvider>
      {QueryDevtools && RouterDevtools ? (
        <Suspense fallback={null}>
          <QueryDevtools buttonPosition="bottom-right" />
          <RouterDevtools router={router} position="top-right" />
        </Suspense>
      ) : null}
    </QueryClientProvider>
  )
}
