import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const BASE_URL = `http://localhost:${PORT}`
const isCI = Boolean(process.env.CI)

/**
 * Os testes rodam contra o build de demonstração (vite preview) com os mocks do MSW ligados:
 * é o mesmo artefato publicado, e cada contexto novo do navegador começa do seed do cenário.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 60_000,
  reporter: [['html', { open: 'never' }], ['list']],
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      // Antialiasing de fonte varia um pouco entre máquinas; diferença real de layout passa bem disso.
      threshold: 0.2,
      maxDiffPixelRatio: 0.01,
      stylePath: './tests/e2e/support/screenshot.css',
    },
  },
  use: {
    baseURL: BASE_URL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    // O MSW depende do service worker; bloqueá-lo desligaria a API simulada.
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
