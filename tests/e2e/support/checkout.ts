import { expect, type Locator, type Page } from '@playwright/test'

/** Tela /pagamento e o diálogo de revisão/acompanhamento do pedido. */
export class CheckoutPage {
  readonly form: Locator
  readonly dialog: Locator

  constructor(
    readonly page: Page,
    readonly isMobile: boolean,
  ) {
    this.form = page.getByRole('form', { name: 'Pagamento' })
    this.dialog = page.getByRole('dialog')
  }

  async expectReady() {
    await expect(this.form).toBeVisible()
    await expect(this.form.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
  }

  /** No mobile os dados do colecionador ficam recolhidos atrás de um botão. */
  async expandCollector() {
    if (!this.isMobile) return
    const toggle = this.form.getByRole('button', { name: /^Dados do colecionador/ })
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  }

  async expandSummary() {
    if (!this.isMobile) return
    const toggle = this.form.getByRole('button', { name: /^Resumo do pedido/ })
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
  }

  field(label: string) {
    return this.form.getByLabel(label)
  }

  async connectWallet() {
    const section = this.form.getByRole('region', { name: 'Carteira e rede' })
    await section.getByRole('button', { name: /^Conectar com / }).click()
    await expect(section.getByRole('button', { name: 'Desconectar' })).toBeVisible()
  }

  async submit() {
    await this.form.getByRole('button', { name: 'Confirmar compra' }).click()
  }

  /** Preenche nada além do que o perfil já traz: conecta a carteira e abre a revisão. */
  async openReview() {
    await this.connectWallet()
    await this.submit()
    await expect(this.dialog.getByRole('heading', { name: 'Revise sua compra' })).toBeVisible()
  }

  confirmButton() {
    return this.dialog.getByRole('button', { name: 'Confirmar compra' })
  }
}

/** Requisições POST /api/orders vistas pelo navegador (antes do service worker do MSW). */
export function trackOrderPosts(page: Page) {
  const keys: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders') {
      keys.push(request.headers()['idempotency-key'] ?? '')
    }
  })
  return keys
}
