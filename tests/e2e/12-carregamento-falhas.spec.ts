import { expect, SEED_NFTS, test } from './support/fixtures'

const ape = SEED_NFTS.emeraldApe

test.describe('Carregamento lento, falhas e nova tentativa', () => {
  test('slow-network: skeletons com shimmer no catálogo e no detalhe até os dados chegarem', async ({ app, page }) => {
    await app.open('/', { scenario: 'slow-network' })

    const loadingGrid = page.locator('[aria-busy="true"][aria-label="Carregando NFTs"]')
    await expect(loadingGrid).toBeVisible()
    expect(await loadingGrid.locator('.skeleton').count()).toBeGreaterThan(0)
    await expect(page.getByRole('list', { name: 'NFTs' })).toBeHidden()

    await expect(page.getByRole('tabpanel').getByRole('status')).toHaveText('60 NFTs encontrados. Página 1 de 7.')
    await expect(loadingGrid).toHaveCount(0)
    await expect(page.getByRole('list', { name: 'NFTs' }).getByRole('article')).toHaveCount(9)

    await page.getByRole('list', { name: 'NFTs' }).getByRole('link', { name: 'Sage Nomad #009' }).click()
    const loadingDetail = page.locator('[aria-busy="true"][aria-label="Carregando NFT"]')
    await expect(loadingDetail).toBeVisible()
    expect(await loadingDetail.locator('.skeleton').count()).toBeGreaterThan(0)
    await expect(page.getByRole('heading', { level: 1, name: 'Sage Nomad #009' })).toBeVisible()
    await expect(loadingDetail).toHaveCount(0)
  })

  test('server-error: o 503 da primeira tentativa é absorvido pelo retry automático', async ({ app, page }) => {
    const failures: string[] = []
    page.on('response', (response) => {
      if (response.status() === 503 && new URL(response.url()).pathname.startsWith('/api/nfts'))
        failures.push(response.url())
    })
    await app.open('/', { scenario: 'server-error' })

    await expect(page.getByRole('tabpanel').getByRole('status')).toHaveText('60 NFTs encontrados. Página 1 de 7.')
    expect(failures.length).toBeGreaterThan(0)
    await expect(page.getByRole('heading', { name: 'Não foi possível carregar o catálogo' })).toHaveCount(0)
  })

  test('offline: erro do catálogo mantém os filtros e "Tentar novamente" recupera', async ({ app, kurio, page }) => {
    await app.open('/?category=fotografia', { scenario: 'offline' })

    const error = page
      .getByRole('alert')
      .filter({ has: page.getByRole('heading', { name: 'Não foi possível carregar o catálogo' }) })
    await expect(error).toBeVisible({ timeout: 20_000 })
    await expect(error).toContainText('Seus filtros foram mantidos.')
    await expect(page).toHaveURL(/category=fotografia/)

    await kurio.network.set({ offline: false })
    await error.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByRole('tabpanel').getByRole('status')).toHaveText('6 NFTs encontrados.')
    await expect(error).toBeHidden()
  })

  test('falha persistente no detalhe mostra o erro e a nova tentativa carrega o NFT', async ({ app, kurio, page }) => {
    await app.open('/', { scenario: 'server-error' })
    // Três 503 seguidos esgotam o retry automático (1 + 2); a quarta chamada, manual, passa.
    await kurio.network.set({
      rules: [
        {
          method: 'GET',
          path: '/api/nfts/:id',
          effect: 'status',
          status: 503,
          code: 'SERVICE_UNAVAILABLE',
          times: 3,
          perUrl: true,
        },
      ],
    })
    await app.open(`/nft/${ape.id}`)

    const error = page
      .getByRole('alert')
      .filter({ has: page.getByRole('heading', { name: 'Não foi possível carregar este NFT' }) })
    await expect(error).toBeVisible({ timeout: 20_000 })
    await error.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(error).toBeHidden()
  })
})
