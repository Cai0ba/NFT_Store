import { test as base, expect } from '@playwright/test'
import { App, hideDevtools } from './app'
import { KurioDriver } from './kurio'

type Fixtures = {
  kurio: KurioDriver
  app: App
  devtoolsHidden: void
}

/**
 * Cada teste recebe um contexto novo do Playwright: storage vazio, então os mocks sobem do seed do
 * cenário pedido. Nada é compartilhado entre testes além do build servido pelo preview.
 */
export const test = base.extend<Fixtures>({
  devtoolsHidden: [
    async ({ page }, provide) => {
      await hideDevtools(page)
      await provide()
    },
    { auto: true },
  ],
  kurio: async ({ page }, provide) => {
    await provide(new KurioDriver(page))
  },
  // `isMobile` é a opção nativa do Playwright: verdadeira no projeto Pixel 7.
  app: async ({ page, kurio, isMobile }, provide) => {
    await provide(new App(page, kurio, isMobile))
  },
})

export { expect }
export { SEED_ACCOUNTS } from './app'
export { SEED_COUPONS, SEED_NFTS, SEED_WALLETS } from '../../../src/mocks'
