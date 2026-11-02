import type { ScenarioName } from '../../src/mocks'
import type { App } from './support/app'
import { CheckoutPage, trackOrderPosts } from './support/checkout'
import { expect, SEED_ACCOUNTS, SEED_NFTS, test } from './support/fixtures'

const ape = SEED_NFTS.emeraldApe

async function prepare(app: App, scenario: ScenarioName, isMobile: boolean) {
  await app.open('/', { scenario })
  await app.loginViaApi(SEED_ACCOUNTS.ana)
  await app.addToCartViaApi([{ nftId: ape.id, editionId: ape.defaultEditionId, quantity: 1 }])
  await app.open('/pagamento')
  const checkout = new CheckoutPage(app.page, isMobile)
  await checkout.expectReady()
  return checkout
}

test.describe('Falhas no pagamento e idempotência', () => {
  test('pagamento recusado mantém os itens no carrinho e permite tentar de novo', async ({ app, page, isMobile }) => {
    const checkout = await prepare(app, 'payment-rejected', isMobile)
    await checkout.openReview()
    await checkout.confirmButton().click()

    const alert = checkout.dialog.getByRole('alert')
    await expect(alert.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible()
    await expect(alert).toContainText('O pagamento foi recusado pela carteira.')
    await expect(alert).toContainText('Nada foi cobrado e seus itens continuam no carrinho.')
    await expect(alert.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
    expect((await app.createdOrders()).map((order) => order.status)).toEqual(['rejected'])

    await alert.getByRole('link', { name: 'Voltar ao carrinho' }).click()
    await expect(page).toHaveURL(/\/carrinho$/)
    await expect(
      page.getByRole('region', { name: 'Itens do carrinho' }).getByRole('listitem', { name: 'Emerald Ape #042' }),
    ).toBeVisible()
  })

  test('clique repetido em "Confirmar compra" gera um único pedido', async ({ app, page, isMobile }) => {
    const posts = trackOrderPosts(page)
    const checkout = await prepare(app, 'default', isMobile)
    await checkout.openReview()

    const confirm = checkout.confirmButton()
    await confirm.dblclick()
    // Um terceiro clique "nervoso" enquanto o botão já está em envio.
    await confirm.click({ force: true, timeout: 1_000 }).catch(() => undefined)

    await expect(page).toHaveURL(/\/pedido\/ord_\d+$/)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
    expect(posts).toHaveLength(1)
    expect(await app.createdOrders()).toHaveLength(1)
  })

  test('timeout depois da criação recupera o mesmo pedido pela Idempotency-Key', async ({ app, page, isMobile }) => {
    await page.clock.install()
    const posts = trackOrderPosts(page)
    const checkout = await prepare(app, 'order-timeout', isMobile)
    await checkout.openReview()
    await checkout.confirmButton().click()

    await expect.poll(() => posts.length).toBe(1)
    await expect(checkout.dialog.getByRole('button', { name: 'Enviando pedido' })).toBeVisible()
    // O servidor segura a resposta por 15 s; o cliente desiste em 8 s e reenvia com a mesma chave.
    await page.clock.fastForward('00:09')
    await expect.poll(() => posts.length).toBe(2)
    expect(posts[1]).toBe(posts[0])

    await expect(page).toHaveURL(/\/pedido\/ord_\d+$/)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
    const orders = await app.createdOrders()
    expect(orders).toHaveLength(1)
    expect(orders[0]?.idempotencyKey).toBe(posts[0])
    expect(orders[0]?.status).toBe('confirmed')
  })
})
