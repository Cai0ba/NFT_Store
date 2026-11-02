import { CheckoutPage, trackOrderPosts } from './support/checkout'
import { expect, SEED_ACCOUNTS, SEED_NFTS, test } from './support/fixtures'

const neon = SEED_NFTS.neonVessel
const NEON_EDITION = `${neon.id}--1-50`

test.describe('Compra completa', () => {
  test('do catálogo ao recibo confirmado, levando só o que pôde ser comprado', async ({
    app,
    kurio,
    page,
    isMobile,
  }) => {
    const orderPosts = trackOrderPosts(page)
    await app.open('/')
    await app.loginViaApi(SEED_ACCOUNTS.ana)
    // Um segundo item que vai esgotar antes do checkout: tem de continuar no carrinho depois da compra.
    await app.addToCartViaApi([{ nftId: neon.id, editionId: NEON_EDITION, quantity: 1 }])
    await app.reload()

    const grid = page.getByRole('list', { name: 'NFTs' })
    if (isMobile) {
      await grid.getByRole('link', { name: 'Emerald Ape #042' }).click()
      await page.getByRole('button', { name: 'Comprar NFT' }).click()
    } else {
      await grid.getByRole('button', { name: 'Adicionar Emerald Ape #042 ao carrinho' }).click()
      await expect(app.cartLink()).toHaveAccessibleName('Carrinho, 2 itens')
      await app.cartLink().click()
    }
    await expect(page).toHaveURL(/\/carrinho$/)
    const items = page.getByRole('region', { name: 'Itens do carrinho' })
    await expect(items.getByRole('listitem', { name: 'Emerald Ape #042' })).toBeVisible()

    await kurio.realtime.waitForConnection()
    await kurio.realtime.updateNft({ nftId: neon.id, editionId: NEON_EDITION, available: 0 })
    await expect(
      items
        .getByRole('status', { name: 'Alterações nos itens do carrinho' })
        .getByText(/Neon Vessel #552 \(1\/50\) esgotou/),
    ).toBeVisible()

    await page.getByRole('link', { name: 'Conectar e finalizar' }).filter({ visible: true }).click()
    await expect(page).toHaveURL(/\/pagamento$/)
    const checkout = new CheckoutPage(page, isMobile)
    await checkout.expectReady()
    await checkout.openReview()

    const review = checkout.dialog
    await expect(review.getByRole('listitem').filter({ hasText: 'Emerald Ape #042 · 1/50 · x 1' })).toContainText(
      '1.19 ETH',
    )
    await expect(
      review.getByRole('region', { name: 'Itens' }).getByRole('listitem').filter({ hasText: 'Neon Vessel #552' }),
    ).toContainText('x 0')
    await expect(review.getByText(/Neon Vessel #552 \(1\/50\) esgotou e não será cobrado/)).toBeVisible()
    await expect(review.getByText('Total: 1,206 ether')).toBeAttached()
    await checkout.confirmButton().click()

    await expect(review.getByRole('heading', { name: 'Aguardando confirmação da rede…' })).toBeVisible()
    await expect(page).toHaveURL(/\/pedido\/ord_\d+$/)
    const receipt = page.getByRole('article', { name: 'Seus NFTs agora estão na sua carteira' })
    await expect(receipt).toBeVisible()
    await expect(receipt.getByRole('row', { name: /Emerald Ape #042/ })).toContainText('1,19 ether')
    await expect(receipt.getByRole('row', { name: /Neon Vessel/ })).toHaveCount(0)
    // Valores do snapshot do pedido: taxa e total iguais aos da revisão.
    await expect(receipt.getByRole('definition').filter({ hasText: /^0\.016 ETH$/ })).toBeVisible()
    await expect(receipt.getByRole('definition').filter({ hasText: /^1\.206 ETH$/ })).toBeVisible()
    await expect(receipt.getByRole('definition').filter({ hasText: /^MetaMask$/ })).toBeVisible()
    await expect(receipt.getByText('Transação confirmada na Ethereum.')).toBeVisible()
    await expect(receipt.getByRole('link', { name: /^Ver no Etherscan/ })).toHaveAttribute(
      'href',
      /^https:\/\/explorer\.kurio\.test\/tx\/0x/,
    )

    const orders = await app.createdOrders()
    expect(orders).toHaveLength(1)
    expect(orders[0]?.status).toBe('confirmed')
    expect(orderPosts).toHaveLength(1)

    // O pedido levou só o Emerald Ape; o item esgotado continua no carrinho para o colecionador decidir.
    await app.open('/carrinho')
    await expect(items.getByRole('listitem', { name: 'Neon Vessel #552' })).toBeVisible()
    await expect(items.getByRole('listitem', { name: 'Emerald Ape #042' })).toHaveCount(0)
  })
})
