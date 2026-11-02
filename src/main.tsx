import '@fontsource/roboto-mono/400.css'
import '@fontsource/roboto-mono/500.css'
import '@fontsource/roboto-mono/700.css'
import '@/styles/index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProviders } from '@/app/providers'
import { queryClient } from '@/app/query-client'
import { router } from '@/app/router'
import { bindSessionLifecycle } from '@/app/session-lifecycle'
import { initSession } from '@/features/auth/session'
import { env } from '@/shared/config/env'

/** Baixa só o código das rotas que casam com a URL inicial; loaders e requisições continuam com o router. */
function preloadInitialRouteChunks() {
  const [routes] = router.getMatchedRoutes(window.location.pathname)
  for (const route of routes) void router.loadRouteChunk(route)?.catch(() => undefined)
}

async function bootstrap() {
  // Nenhuma requisição pode sair antes do worker do MSW assumir, senão o build de demo bate num backend inexistente.
  if (env.enableMocks) {
    const mocks = import('./mocks/browser').then((m) => m.startMocks())
    // Enquanto o worker sobe, os chunks da rota já vêm pela rede (sem isso, só começariam depois do boot).
    preloadInitialRouteChunks()
    await mocks
  }

  bindSessionLifecycle(queryClient, router)
  // Não bloqueia o render: rotas públicas aparecem já; guards privados aguardam a validação.
  void initSession(queryClient)

  const container = document.getElementById('root')
  if (!container) throw new Error('Elemento #root não encontrado')
  createRoot(container).render(
    <StrictMode>
      <AppProviders />
    </StrictMode>,
  )
}

void bootstrap()
