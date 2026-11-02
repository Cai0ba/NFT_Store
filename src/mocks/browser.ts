import { setupWorker } from 'msw/browser'
import { env } from '@/shared/config/env'
import { mockControl } from './control'
import { db } from './db/store'
import { handlers } from './handlers'
import { runtime } from './runtime'
import { SCENARIOS } from './scenarios'
import { resumePendingPayments } from './services/payments'

let started: Promise<void> | null = null

/** O painel é carregado só depois do load e com a thread ociosa, fora do caminho crítico de renderização. */
function schedulePanel() {
  const load = () => void import('./devtools/mount').then((m) => m.mountSimulationPanel())
  const idle = () => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(load, { timeout: 3000 })
    else setTimeout(load, 1500)
  }
  if (document.readyState === 'complete') idle()
  else window.addEventListener('load', idle, { once: true })
}

async function boot() {
  const config = runtime.init()
  await db.init(SCENARIOS[config.scenario].seed)
  const worker = setupWorker(...handlers)
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
    quiet: !env.isDev,
  })
  resumePendingPayments()
  window.__kurio = mockControl
  schedulePanel()
}

/** Idempotente: o HMR pode reavaliar quem chama sem registrar o worker duas vezes. */
export function startMocks(): Promise<void> {
  started ??= boot()
  return started
}
