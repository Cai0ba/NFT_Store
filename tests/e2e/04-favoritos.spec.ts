import { expect, SEED_ACCOUNTS, test } from './support/fixtures'

const SAGE = 'Sage Nomad #009'

test.describe('Favoritos', () => {
  test('favoritar e desfavoritar persiste após refresh e aparece na lista de interesse', async ({ app, page }) => {
    await app.open('/')
    await app.loginViaApi(SEED_ACCOUNTS.bruno)

    const grid = page.getByRole('list', { name: 'NFTs' })
    await grid.getByRole('button', { name: `Favoritar ${SAGE}` }).click()
    const remove = grid.getByRole('button', { name: `Remover ${SAGE} dos favoritos` })
    await expect(remove).toHaveAttribute('aria-pressed', 'true')
    await expect(remove).not.toHaveAttribute('aria-busy', 'true')

    await app.reload()
    await expect(grid.getByRole('button', { name: `Remover ${SAGE} dos favoritos` })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await app.open('/perfil/favoritos')
    await expect(page.getByRole('heading', { name: /^Lista de interesse/ })).toHaveText(/\(1\)/)
    await expect(page.getByRole('article', { name: SAGE })).toBeVisible()

    // A lista esvazia de forma otimista; o reload só prova persistência depois que o DELETE terminou.
    const removed = page.waitForResponse(
      (r) => r.request().method() === 'DELETE' && r.url().includes('/api/me/favorites/'),
    )
    await page.getByRole('button', { name: `Remover ${SAGE} dos favoritos` }).click()
    await expect(page.getByRole('heading', { name: 'Sua lista de interesse está vazia' })).toBeVisible()
    await removed
    await app.reload()
    await expect(page.getByRole('heading', { name: 'Sua lista de interesse está vazia' })).toBeVisible()
  })

  test('visitante é levado ao login ao tentar favoritar', async ({ app, page }) => {
    await app.open('/')
    await page
      .getByRole('list', { name: 'NFTs' })
      .getByRole('button', { name: `Favoritar ${SAGE}` })
      .click()
    await expect(page).toHaveURL(/\/entrar/)
    await expect(app.toast('Entre na sua conta para salvar favoritos.')).toBeVisible()
  })

  test('falha da mutation desfaz o otimismo com mensagem e o estado se recupera no cenário normal', async ({
    app,
    kurio,
    page,
  }) => {
    await app.open('/', { scenario: 'favorites-failure' })
    await app.loginViaApi(SEED_ACCOUNTS.bruno)
    // Segura a resposta de erro um pouco para o estado otimista ser observável.
    const { rules } = await kurio.network.get()
    await kurio.network.set({
      rules: [{ method: 'PUT', path: '/api/me/favorites/:nftId', effect: 'delay', delayMs: 1500 }, ...rules],
    })

    const grid = page.getByRole('list', { name: 'NFTs' })
    await grid.getByRole('button', { name: `Favoritar ${SAGE}` }).click()
    await expect(grid.getByRole('button', { name: `Remover ${SAGE} dos favoritos` })).toHaveAttribute(
      'aria-busy',
      'true',
    )

    const rolledBack = grid.getByRole('button', { name: `Favoritar ${SAGE}` })
    await expect(rolledBack).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByText('Não foi possível favoritar', { exact: true })).toBeVisible()
    await expect(page.getByText(/O estado anterior foi restaurado\./)).toBeVisible()
    await expect(page.getByRole('alert').filter({ hasText: `${SAGE}: não foi possível favoritar.` })).toBeAttached()

    await app.reload()
    await expect(grid.getByRole('button', { name: `Favoritar ${SAGE}` })).toHaveAttribute('aria-pressed', 'false')

    await kurio.setScenario('default')
    await grid.getByRole('button', { name: `Favoritar ${SAGE}` }).click()
    await expect(grid.getByRole('button', { name: `Remover ${SAGE} dos favoritos` })).not.toHaveAttribute(
      'aria-busy',
      'true',
    )
    await app.reload()
    await expect(grid.getByRole('button', { name: `Remover ${SAGE} dos favoritos` })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
