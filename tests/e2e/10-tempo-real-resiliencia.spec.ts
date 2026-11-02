import { CheckoutPage, trackOrderPosts } from './support/checkout'
import { expect, SEED_ACCOUNTS, SEED_NFTS, test } from './support/fixtures'

const ape = SEED_NFTS.emeraldApe
const neon = SEED_NFTS.neonVessel
const NEON_EDITION = `${neon.id}--1-50`

test.describe('Eventos fora de ordem, quedas de conexão e pedido pendente', () => {
  test('evento antigo não regride o preço do detalhe', async ({ app, kurio, page }) => {
    await app.open(`/nft/${ape.id}`)
    const price = page.getByText(/^Preço da edição 1\/50:/)
    await expect(price).toHaveText('Preço da edição 1/50: 1,19 ether')
    await kurio.realtime.waitForConnection()

    await kurio.realtime.updateNft({ nftId: ape.id, editionId: ape.defaultEditionId, priceEth: '1.50' })
    await expect(price).toHaveText('Preço da edição 1/50: 1,50 ether')
    await kurio.realtime.updateNft({ nftId: ape.id, editionId: ape.defaultEditionId, priceEth: '1.60' })
    await expect(price).toHaveText('Preço da edição 1/50: 1,60 ether')

    await kurio.realtime.emitStale(ape.id)
    await kurio.realtime.replayLast(ape.id)
    // Eventos chegam em ordem pelo mesmo socket: quando o marcador aparece, os anteriores já foram tratados.
    const related = page
      .getByRole('region', { name: 'Mais desta coleção' })
      .getByRole('article', { name: 'Cosmic Bloom #118' })
    await kurio.realtime.updateNft({ nftId: 'cosmic-bloom-118', priceEth: '0.77' })
    await expect(related.getByText(/^Preço:/)).toHaveText('Preço: 0,77 ether')
    await expect(price).toHaveText('Preço da edição 1/50: 1,60 ether')
  })

  test('evento duplicado não repete o aviso nem o efeito no carrinho', async ({ app, kurio, page }) => {
    await app.open('/')
    await app.addToCartViaApi([
      { nftId: ape.id, editionId: ape.defaultEditionId, quantity: 1 },
      { nftId: neon.id, editionId: NEON_EDITION, quantity: 1 },
    ])
    await app.open('/carrinho')
    const notices = page.getByRole('status', { name: 'Alterações nos itens do carrinho' })
    const item = page
      .getByRole('region', { name: 'Itens do carrinho' })
      .getByRole('listitem', { name: 'Emerald Ape #042' })
    // O aviso compara com o carrinho em cache: o evento só faz sentido depois de ele carregar.
    await expect(item.getByText('Total do item: 1,19 ether').filter({ visible: true })).toBeVisible()
    await kurio.realtime.waitForConnection()

    await kurio.realtime.updateNft({ nftId: ape.id, editionId: ape.defaultEditionId, priceEth: '1.50' })
    await expect(notices.getByRole('listitem')).toHaveCount(1)

    await kurio.realtime.replayLast(ape.id)
    await kurio.realtime.emitStale(ape.id)
    await kurio.realtime.updateNft({ nftId: neon.id, editionId: NEON_EDITION, priceEth: '2.10' })
    await expect(notices.getByRole('listitem').filter({ hasText: 'Neon Vessel #552' })).toBeVisible()
    await expect(notices.getByRole('listitem')).toHaveCount(2)
    await expect(notices.getByRole('listitem').filter({ hasText: 'Emerald Ape #042' })).toHaveCount(1)
    await expect(item.getByText('Total do item: 1,50 ether').filter({ visible: true })).toBeVisible()
  })

  test('mudança perdida durante a queda é recuperada pelo REST ao reconectar', async ({ app, kurio, page }) => {
    await app.open(`/nft/${ape.id}`)
    const price = page.getByText(/^Preço da edição 1\/50:/)
    await expect(price).toHaveText('Preço da edição 1/50: 1,19 ether')
    await kurio.realtime.waitForConnection()

    await kurio.realtime.pause()
    await expect.poll(() => kurio.realtime.connections()).toBe(0)
    await kurio.realtime.updateNft({ nftId: ape.id, editionId: ape.defaultEditionId, priceEth: '1.75' })
    const offlineNotice = page.getByText('Atualizações em tempo real pausadas. Tentando reconectar…')
    await expect(offlineNotice).toBeVisible()
    await kurio.realtime.resume()

    // A tentativa pendurada durante a queda só expira no timeout de conexão do cliente (6 s).
    await kurio.realtime.waitForConnection({ timeout: 15_000 })
    await expect(offlineNotice).toBeHidden()
    await expect(price).toHaveText('Preço da edição 1/50: 1,75 ether')

    // Queda curta (servidor derruba a conexão): o cliente volta sozinho e segue recebendo eventos.
    await kurio.realtime.disconnect()
    await kurio.realtime.waitForConnection()
    await kurio.realtime.updateNft({ nftId: ape.id, editionId: ape.defaultEditionId, priceEth: '1.80' })
    await expect(price).toHaveText('Preço da edição 1/50: 1,80 ether')
  })

  test('pedido pendente sobrevive a refresh e queda de conexão sem criar outra compra', async ({
    app,
    kurio,
    page,
    isMobile,
  }) => {
    const posts = trackOrderPosts(page)
    await app.open('/')
    await app.loginViaApi(SEED_ACCOUNTS.ana)
    await app.addToCartViaApi([{ nftId: ape.id, editionId: ape.defaultEditionId, quantity: 1 }])
    await kurio.payments.setOutcome('hold')
    await app.open('/pagamento')
    const checkout = new CheckoutPage(page, isMobile)
    await checkout.expectReady()
    await checkout.openReview()
    await checkout.confirmButton().click()
    const waiting = page.getByRole('heading', { name: 'Aguardando confirmação da rede…' })
    await expect(waiting).toBeVisible()

    await app.reload()
    await expect(waiting).toBeVisible()
    await kurio.realtime.waitForConnection()

    await kurio.realtime.pause()
    await expect.poll(() => kurio.realtime.connections()).toBe(0)
    await kurio.payments.settle('confirm')
    await kurio.realtime.resume()

    await expect(page).toHaveURL(/\/pedido\/ord_\d+$/)
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
    expect(posts).toHaveLength(1)
    const orders = await app.createdOrders()
    expect(orders).toHaveLength(1)
    expect(orders[0]?.status).toBe('confirmed')

    // Confirmado é terminal: liquidar de novo como recusa não muda nada.
    await kurio.payments.settle('reject')
    await app.reload()
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible()
  })
})
