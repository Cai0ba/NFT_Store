import { CatalogPage } from './support/catalog'
import { expect, test } from './support/fixtures'

test.describe('Catálogo: busca, filtros, ordenação e paginação', () => {
  let catalog: CatalogPage

  test.beforeEach(async ({ app, page, isMobile }) => {
    catalog = new CatalogPage(page, isMobile)
    await app.open('/')
    await catalog.expectStatus('60 NFTs encontrados. Página 1 de 7.')
  })

  test('busca por nome atualiza a grade e fica registrada na URL', async ({ app, page }) => {
    await catalog.search('nomad')

    await expect(page).toHaveURL(/[?&]q=nomad/)
    // A busca cobre nome e coleção; a grade tem de mostrar exatamente o que a API devolve.
    const expected = await app.catalogPage('?q=nomad&pageSize=9')
    expect(expected.total).toBeGreaterThan(0)
    expect(expected.total).toBeLessThan(60)
    expect(expected.names).toContain('Sage Nomad #009')
    await expect(catalog.resultStatus).toHaveText(new RegExp(`^${expected.total} NFTs encontrados\\.`))
    expect(await catalog.cardNames()).toEqual(expected.names)
  })

  test('filtros combinados com ordenação zeram a página e resistem a refresh, voltar e avançar', async ({
    app,
    page,
  }) => {
    await page
      .getByRole('navigation', { name: 'Paginação do catálogo' })
      .getByRole('link', { name: 'Página 2' })
      .click()
    await catalog.expectStatus('60 NFTs encontrados. Página 2 de 7.')

    await catalog.toggleFacet('Arte digital')
    await expect(page).toHaveURL(/category=arte-digital/)
    await expect(page).not.toHaveURL(/page=/)
    await catalog.toggleFacet('Ethereum')
    await expect(page).toHaveURL(/network=ethereum/)
    await catalog.sortBy('Menor preço')
    await expect(page).toHaveURL(/sort=menor-preco/)
    await catalog.closeFilters()

    await expect(catalog.resultStatus).toHaveText(/^\d+ NFTs? encontrados?\.$/)
    const filteredStatus = await catalog.resultStatus.innerText()
    const prices = await catalog.cardPrices()
    expect(prices.length).toBeGreaterThan(0)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))

    await app.reload()
    await catalog.expectStatus(filteredStatus)
    expect(await catalog.cardPrices()).toEqual(prices)
    const filters = await catalog.filters()
    await expect(catalog.facet(filters, 'Arte digital')).toHaveAttribute('aria-pressed', 'true')
    await expect(catalog.facet(filters, 'Ethereum')).toHaveAttribute('aria-pressed', 'true')
    await catalog.closeFilters()

    // Voltar desfaz só a última mudança (ordenação); avançar a reaplica.
    await page.goBack()
    await expect(page).not.toHaveURL(/sort=/)
    await expect(page).toHaveURL(/network=ethereum/)
    await page.goForward()
    await expect(page).toHaveURL(/sort=menor-preco/)
    await catalog.expectStatus(filteredStatus)
    expect(await catalog.cardPrices()).toEqual(prices)
  })

  test('paginação com voltar/avançar do navegador', async ({ page }) => {
    const firstPage = await catalog.cardNames()
    expect(firstPage[0]).toBe('Emerald Ape #042')

    await page
      .getByRole('navigation', { name: 'Paginação do catálogo' })
      .getByRole('link', { name: 'Próxima página' })
      .click()
    await expect(page).toHaveURL(/page=2/)
    await catalog.expectStatus('60 NFTs encontrados. Página 2 de 7.')
    const secondPage = await catalog.cardNames()
    expect(secondPage).toHaveLength(9)
    expect(secondPage).not.toContain('Emerald Ape #042')

    await page.goBack()
    await catalog.expectStatus('60 NFTs encontrados. Página 1 de 7.')
    expect(await catalog.cardNames()).toEqual(firstPage)

    await page.goForward()
    await catalog.expectStatus('60 NFTs encontrados. Página 2 de 7.')
    expect(await catalog.cardNames()).toEqual(secondPage)
  })

  test('trocar de aba volta para a primeira página', async ({ app, page }) => {
    await app.open('/?page=3')
    await catalog.expectStatus('60 NFTs encontrados. Página 3 de 7.')
    await page.getByRole('tab', { name: 'Em alta' }).click()
    await expect(page).toHaveURL(/tab=em-alta/)
    await expect(page).not.toHaveURL(/page=/)
    await expect(page.getByRole('tab', { name: 'Em alta' })).toHaveAttribute('aria-selected', 'true')
    await expect(catalog.resultStatus).toHaveText(/Página 1 de/)
  })

  test('resultado vazio explica o motivo e "Limpar filtros" restaura o catálogo', async ({ page }) => {
    await catalog.search('inexistente-xyz')
    await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
    await catalog.expectStatus('Nenhum NFT encontrado.')
    await expect(page.getByText('Nada corresponde a “inexistente-xyz”')).toBeVisible()

    await page.getByRole('tabpanel').getByRole('button', { name: 'Limpar filtros' }).click()
    await catalog.expectStatus('60 NFTs encontrados. Página 1 de 7.')
    await expect(page).not.toHaveURL(/q=/)
    await expect(page.getByRole('searchbox')).toHaveValue('')
  })

  test('URL editada à mão com valores inválidos é tolerada', async ({ app, page }) => {
    await app.open('/?category=nao-existe&sort=qualquer&page=abc&network=polygon')
    await expect(catalog.resultStatus).toHaveText(/^22 NFTs encontrados\./)
    await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeHidden()
  })
})

test.describe('Catálogo vazio', () => {
  test('cenário empty-catalog mostra o estado vazio sem filtros ativos', async ({ app, page }) => {
    await app.open('/', { scenario: 'empty-catalog' })
    await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
    await expect(page.getByText('Ainda não há NFTs listados no mercado. Volte em breve.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Limpar filtros' })).toHaveCount(0)
  })
})
