import { CheckoutPage } from './support/checkout'
import { expect, SEED_ACCOUNTS, SEED_NFTS, test } from './support/fixtures'
import { FROZEN_NOW, settleForScreenshot } from './support/visual'

const ape = SEED_NFTS.emeraldApe
const CART = [
  { nftId: ape.id, editionId: ape.defaultEditionId, quantity: 2 },
  { nftId: SEED_NFTS.neonVessel.id, editionId: `${SEED_NFTS.neonVessel.id}--1-50`, quantity: 1 },
]

test.describe('Regressão visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(FROZEN_NOW)
  })

  test('Início', async ({ app, page }) => {
    await app.open('/')
    await expect(page.getByRole('tabpanel').getByRole('status')).toHaveText('60 NFTs encontrados. Página 1 de 7.')
    await settleForScreenshot(page)
    await expect(page).toHaveScreenshot('inicio.png', { fullPage: true })
  })

  test('Detalhe do NFT', async ({ app, page }) => {
    await app.open(`/nft/${ape.id}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Mais desta coleção' }).getByRole('article').first()).toBeVisible()
    await settleForScreenshot(page)
    await expect(page).toHaveScreenshot('detalhe-emerald-ape-042.png', { fullPage: true })
  })

  test('Carrinho', async ({ app, page }) => {
    await app.open('/')
    await app.addToCartViaApi(CART)
    await app.open('/carrinho')
    await expect(
      page.getByRole('region', { name: 'Itens do carrinho' }).getByRole('listitem', { name: 'Neon Vessel #552' }),
    ).toBeVisible()
    await expect(page.getByText('Total: 4,386 ether').filter({ visible: true })).toBeVisible()
    await settleForScreenshot(page)
    await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true })
  })

  test('Pagamento', async ({ app, page, isMobile }) => {
    await app.open('/')
    await app.loginViaApi(SEED_ACCOUNTS.ana)
    await app.addToCartViaApi(CART)
    await app.open('/pagamento')
    await new CheckoutPage(page, isMobile).expectReady()
    // No mobile o resumo fica recolhido e só o total aparece ao lado do botão.
    await expect(
      page.getByText(isMobile ? '4,386 ether' : 'Total: 4,386 ether', { exact: true }).filter({ visible: true }),
    ).toBeVisible()
    await settleForScreenshot(page)
    await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true })
  })
})
