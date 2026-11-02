import type { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { authController, type AuthController } from '@/features/auth/session'
import { routeTree } from '@/routeTree.gen'
import { queryClient } from './query-client'
import { parseSearch, stringifySearch } from './search-params'

export interface RouterContext {
  queryClient: QueryClient
  auth: AuthController
}

export const router = createRouter({
  routeTree,
  context: { queryClient, auth: authController } satisfies RouterContext,
  defaultPreload: 'intent',
  // O cache fica com o TanStack Query; o router não guarda cópia própria dos loaders.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  parseSearch,
  stringifySearch,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
