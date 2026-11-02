import { expect, type Locator, type Page } from '@playwright/test'

/** "Preço: 1,99 ether, antes 2,29 ether" → 1.99 (o primeiro valor é o preço atual). */
export function parseEther(text: string) {
  const match = /(\d+(?:[.,]\d+)?)\s*(?:ether|ETH)/.exec(text)
  if (!match?.[1]) throw new Error(`Preço não encontrado em "${text}"`)
  return Number(match[1].replace(',', '.'))
}

export class CatalogPage {
  readonly grid: Locator
  readonly cards: Locator
  readonly resultStatus: Locator

  constructor(
    readonly page: Page,
    readonly isMobile: boolean,
  ) {
    this.grid = page.getByRole('list', { name: 'NFTs' })
    this.cards = this.grid.getByRole('article')
    this.resultStatus = page.getByRole('tabpanel').getByRole('status')
  }

  card(name: string) {
    return this.grid.getByRole('article', { name })
  }

  async cardNames() {
    return this.grid.getByRole('heading', { level: 3 }).allInnerTexts()
  }

  async cardPrices() {
    const texts = await this.cards.getByText(/^Preço:/).allInnerTexts()
    return texts.map(parseEther)
  }

  async search(text: string) {
    if (!this.isMobile) {
      const box = this.page.getByRole('banner').getByRole('searchbox')
      if (!(await box.isVisible())) await this.page.getByRole('button', { name: 'Buscar NFTs' }).click()
    }
    await this.page.getByRole('searchbox').fill(text)
  }

  /** No mobile os filtros ficam num sheet; no desktop, na barra lateral. */
  async filters() {
    if (!this.isMobile) return this.page.getByRole('complementary', { name: 'Filtros do catálogo' })
    const dialog = this.page.getByRole('dialog', { name: 'Filtros' })
    if (!(await dialog.isVisible())) await this.page.getByRole('button', { name: /^Filtros e ordenação/ }).click()
    await expect(dialog).toBeVisible()
    return dialog
  }

  async closeFilters() {
    if (this.isMobile) {
      await this.page.getByRole('dialog', { name: 'Filtros' }).getByRole('button', { name: 'Ver resultados' }).click()
      await expect(this.page.getByRole('dialog', { name: 'Filtros' })).toBeHidden()
    }
  }

  async toggleFacet(label: string) {
    const scope = await this.filters()
    await scope.getByRole('button', { name: new RegExp(`^${label} ,`) }).click()
  }

  facet(scope: Locator, label: string) {
    return scope.getByRole('button', { name: new RegExp(`^${label} ,`) })
  }

  async sortBy(label: string) {
    if (this.isMobile) {
      const scope = await this.filters()
      await scope.getByRole('radio', { name: label }).check()
      return
    }
    await this.page.getByRole('button', { name: /^Ordenar por:/ }).click()
    await this.page.getByRole('menuitemradio', { name: label }).click()
  }

  /** Espera a grade estabilizar (sem dados de placeholder da busca anterior). */
  async expectStatus(text: string | RegExp) {
    await expect(this.resultStatus).toHaveText(text)
  }
}
