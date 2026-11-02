import { expect, SEED_NFTS, test } from './support/fixtures'

const ape = SEED_NFTS.emeraldApe

test.describe('Detalhe do NFT e recursos inexistentes', () => {
  test('acesso direto ao detalhe mostra dados, edições e preço da edição escolhida', async ({ app, page }) => {
    await app.open(`/nft/${ape.id}`)

    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page).toHaveTitle(/Emerald Ape #042/)
    await expect(page.getByText('Preço da edição 1/50: 1,19 ether')).toBeVisible()
    await expect(page.getByText('Nota 4,8 de 5, 19 avaliações de colecionadores')).toBeVisible()
    await expect(page.getByRole('img', { name: /^Emerald Ape #042:/ }).first()).toBeVisible()

    const editions = page.getByRole('radiogroup', { name: 'Edição:' })
    await expect(editions.getByRole('radio', { name: '1/50' })).toBeChecked()
    await expect(editions.getByRole('radio', { name: /ABERTA.*esgotada/ })).toBeDisabled()

    await editions.getByRole('radio', { name: '1/10' }).click()
    await expect(page).toHaveURL(/edition=emerald-ape-042--1-10/)
    await expect(page.getByText(/^Preço da edição 1\/10:/)).toBeVisible()

    // A edição faz parte da URL: compartilhar ou recarregar mantém a escolha.
    await app.reload()
    await expect(page.getByRole('radiogroup', { name: 'Edição:' }).getByRole('radio', { name: '1/10' })).toBeChecked()
  })

  test('do catálogo para o detalhe e de volta pelo histórico', async ({ app, page }) => {
    await app.open('/')
    await page.getByRole('list', { name: 'NFTs' }).getByRole('link', { name: 'Sage Nomad #009' }).click()
    await expect(page).toHaveURL(/\/nft\/sage-nomad-009$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Sage Nomad #009' })).toBeVisible()

    await page.goBack()
    await expect(
      page.getByRole('list', { name: 'NFTs' }).getByRole('article', { name: 'Sage Nomad #009' }),
    ).toBeVisible()
  })

  test('NFT inexistente mostra "não encontrado" com saída para o mercado', async ({ app, page }) => {
    await app.open('/nft/nao-existe')

    await expect(page.getByRole('heading', { name: 'NFT não encontrado' }).first()).toBeAttached()
    await expect(page.getByText('Este NFT não existe ou foi removido do mercado.')).toBeVisible()
    await expect(page).toHaveTitle(/NFT não encontrado/)

    await page.getByRole('link', { name: 'Explorar o mercado' }).click()
    await expect(page).toHaveURL(/\/#catalogo$/)
    await expect(page.getByRole('list', { name: 'NFTs' })).toBeVisible()
  })

  test('rota inexistente cai na página 404', async ({ app, page }) => {
    await app.open('/rota/que/nao/existe')

    await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible()
    await expect(page).toHaveTitle(/Página não encontrada/)
    await page.getByRole('link', { name: 'Voltar ao início' }).click()
    await expect(page).toHaveURL(/\/$/)
  })
})
