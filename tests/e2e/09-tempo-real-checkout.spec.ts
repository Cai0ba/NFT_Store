import type { ScenarioName } from '../../src/mocks'
import type { App } from './support/app'
import { CheckoutPage } from './support/checkout'
import { expect, SEED_ACCOUNTS, SEED_NFTS, test } from './support/fixtures'

const ape = SEED_NFTS.emeraldApe

async function loginWithApeInCart(app: App, scenario: ScenarioName = 'default') {
  await app.open('/', { scenario })
  await app.loginViaApi(SEED_ACCOUNTS.ana)
  await app.addToCartViaApi([{ nftId: ape.id, editionId: ape.defaultEditionId, quantity: 1 }])
}

test.describe('Preço e disponibilidade em tempo real durante a compra', () => {
  test('carrinho avisa a mudança de preço, atualiza o resumo e permite aceitar', async ({ app, kurio, page }) => {
    await loginWithApeInCart(app)
    await app.open('/carrinho')
    const summary = page.getByRole('complementary', { name: 'Resumo da carteira' })
    await expect(summary.getByText('Subtotal: 1,19 ether').filter({ visible: true })).toBeVisible()
    await kurio.realtime.waitForConnection()

    await kurio.realtime.updateNft({ nftId: ape.id, editionId: ape.defaultEditionId, priceEth: '1.50' })

    const notices = page.getByRole('status', { name: 'Alterações nos itens do carrinho' })
    await expect(notices.getByRole('listitem')).toHaveCount(1)
    await expect(notices).toContainText(
      'Preço alterado: O preço de Emerald Ape #042 (1/50) subiu de 1.19 ETH para 1.50 ETH.',
    )
    await expect(summary.getByText('Subtotal: 1,50 ether').filter({ visible: true })).toBeVisible()
    await expect(page.getByRole('alert').filter({ hasText: 'subiu de 1.19 ETH para 1.50 ETH' })).toBeAttached()

    await notices.getByRole('button', { name: 'Aceitar novo preço' }).click()
    await expect(app.toast('Novo preço aceito.')).toBeVisible()
    await expect(notices.getByRole('listitem')).toHaveCount(0)
  })

  test('mudança durante a revisão bloqueia a confirmação até aceitar os novos valores', async ({
    app,
    kurio,
    page,
    isMobile,
  }) => {
    await loginWithApeInCart(app)
    await app.open('/pagamento')
    const checkout = new CheckoutPage(page, isMobile)
    await checkout.expectReady()
    await checkout.openReview()
    await kurio.realtime.waitForConnection()

    await kurio.realtime.updateNft({ nftId: ape.id, editionId: ape.defaultEditionId, priceEth: '1.50' })

    const dialog = checkout.dialog
    await expect(dialog.getByRole('heading', { name: 'Os valores mudaram' })).toBeVisible()
    const diff = dialog.getByRole('table', { name: 'O que mudou' })
    await expect(diff.getByRole('row', { name: /Emerald Ape #042/ })).toContainText('1 × 1.19 ETH')
    await expect(diff.getByRole('row', { name: /Emerald Ape #042/ })).toContainText('1 × 1.50 ETH')
    await expect(diff.getByRole('row', { name: /^Total/ })).toContainText('(aumentou)')
    await expect(dialog.getByRole('button', { name: 'Confirmar compra' })).toHaveCount(0)

    await dialog.getByRole('button', { name: 'Aceitar novos valores' }).click()
    await expect(dialog.getByRole('heading', { name: 'Revise sua compra' })).toBeVisible()
    await expect(dialog.getByText('Total: 1,516 ether')).toBeAttached()
    await checkout.confirmButton().click()

    await expect(page).toHaveURL(/\/pedido\/ord_\d+$/)
    const receipt = page.getByRole('article', { name: 'Seus NFTs agora estão na sua carteira' })
    await expect(receipt.getByRole('definition').filter({ hasText: /^1\.516 ETH$/ })).toBeVisible()
  })

  test('price-change-on-checkout: o servidor recusa a cotação velha e a UI pede novo aceite', async ({
    app,
    page,
    isMobile,
  }) => {
    await loginWithApeInCart(app, 'price-change-on-checkout')
    await app.open('/pagamento')
    const checkout = new CheckoutPage(page, isMobile)
    await checkout.expectReady()
    await checkout.openReview()
    await checkout.confirmButton().click()

    const dialog = checkout.dialog
    await expect(dialog.getByRole('heading', { name: 'Os valores mudaram' })).toBeVisible()
    // +10% no primeiro item: 1,19 → 1,309
    await expect(dialog.getByRole('table', { name: 'O que mudou' })).toContainText('1 × 1.309 ETH')
    expect(await app.createdOrders()).toHaveLength(0)

    await dialog.getByRole('button', { name: 'Aceitar novos valores' }).click()
    await checkout.confirmButton().click()
    await expect(page).toHaveURL(/\/pedido\/ord_\d+$/)
    const orders = await app.createdOrders()
    expect(orders).toHaveLength(1)
    await expect(page.getByRole('definition').filter({ hasText: /^1\.325 ETH$/ })).toBeVisible()
  })

  test('sold-out-on-checkout: edição esgotada no envio não deixa confirmar uma compra vazia', async ({
    app,
    page,
    isMobile,
  }) => {
    await loginWithApeInCart(app, 'sold-out-on-checkout')
    await app.open('/pagamento')
    const checkout = new CheckoutPage(page, isMobile)
    await checkout.expectReady()
    await checkout.openReview()
    await checkout.confirmButton().click()

    const dialog = checkout.dialog
    await expect(dialog.getByRole('heading', { name: 'Os valores mudaram' })).toBeVisible()
    await expect(
      dialog.getByRole('table', { name: 'O que mudou' }).getByRole('row', { name: /Emerald Ape #042/ }),
    ).toContainText('Esgotado')

    await dialog.getByRole('button', { name: 'Aceitar novos valores' }).click()
    await expect(dialog.getByText('Nenhum item disponível para compra nesta cotação.')).toBeVisible()
    await expect(checkout.confirmButton()).toBeDisabled()
    expect(await app.createdOrders()).toHaveLength(0)

    await dialog.getByRole('button', { name: 'Voltar e editar' }).click()
    await app.open('/carrinho')
    await expect(
      page.getByRole('region', { name: 'Itens do carrinho' }).getByText(/esgot/i).filter({ visible: true }).first(),
    ).toBeVisible()
  })
})
