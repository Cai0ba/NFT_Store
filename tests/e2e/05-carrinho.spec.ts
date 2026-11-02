import type { Page } from '@playwright/test'
import { expect, SEED_ACCOUNTS, SEED_COUPONS, SEED_NFTS, test } from './support/fixtures'

const ape = SEED_NFTS.emeraldApe
const APE = 'Emerald Ape #042'

function cartItems(page: Page) {
  return page.getByRole('region', { name: 'Itens do carrinho' })
}

function line(page: Page, name: string) {
  return cartItems(page).getByRole('listitem', { name })
}

// Desktop e mobile renderizam variantes próprias de alguns trechos; só uma fica visível por vez.
function summary(page: Page) {
  return page.getByRole('complementary', { name: 'Resumo da carteira' })
}

/** Botão de compra do detalhe: "Comprar" no desktop, "Comprar NFT" no mobile; ambos levam ao carrinho. */
async function buyFromDetail(page: Page) {
  await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
}

test.describe('Carrinho', () => {
  test('adicionar pelo detalhe, ajustar quantidade até o limite da edição e remover', async ({ app, page }) => {
    await app.open(`/nft/${ape.id}?edition=${ape.id}--1-10`)
    await expect(page.getByText(/^Preço da edição 1\/10:/).filter({ visible: true })).toBeVisible()
    await buyFromDetail(page)

    const item = line(page, APE)
    await expect(item.getByText('Total do item: 2,49 ether').filter({ visible: true })).toBeVisible()

    const stepper = item.getByRole('group', { name: `Quantidade de ${APE}` })
    const increase = stepper.getByRole('button', { name: `Aumentar quantidade de ${APE}` })
    // A edição 1/10 tem 4 unidades disponíveis no seed.
    for (const quantity of [2, 3, 4]) {
      await increase.click()
      await expect(stepper.getByRole('status')).toHaveText(new RegExp(`^Quantidade: ${quantity}`))
    }
    await expect(increase).toBeDisabled()
    await expect(item.getByText('Total do item: 9,96 ether').filter({ visible: true })).toBeVisible()
    await expect(summary(page).getByText('Subtotal: 9,96 ether').filter({ visible: true })).toBeVisible()

    await stepper.getByRole('button', { name: `Diminuir quantidade de ${APE}` }).click()
    await expect(stepper.getByRole('status')).toHaveText(/^Quantidade: 3/)
    await expect(item.getByText('Total do item: 7,47 ether').filter({ visible: true })).toBeVisible()
    await item
      .getByRole('button', { name: `Remover ${APE} do carrinho` })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
    await app.open('/')
    await expect(app.cartLink()).toHaveAccessibleName('Carrinho vazio')
  })

  test('cupom inválido, expirado e válido recalculam o resumo pela API', async ({ app, page }) => {
    await app.open('/')
    await app.addToCartViaApi([{ nftId: ape.id, editionId: ape.defaultEditionId, quantity: 1 }])
    await app.open('/carrinho')
    await expect(summary(page).getByText('Total: 1,206 ether').filter({ visible: true })).toBeVisible()

    const code = summary(page).getByRole('textbox', { name: 'Código promocional' })
    const apply = summary(page).getByRole('button', { name: 'Aplicar', exact: true })

    await code.fill('NAOEXISTE')
    await apply.click()
    await expect(code).toHaveAttribute('aria-invalid', 'true')
    await expect(code).toHaveAccessibleDescription('Cupom inválido.')
    await expect(code).toBeFocused()

    await code.fill(SEED_COUPONS.expired)
    await apply.click()
    await expect(code).toHaveAccessibleDescription('Este cupom expirou.')
    await expect(summary(page).getByText('Total: 1,206 ether').filter({ visible: true })).toBeVisible()

    await code.fill(SEED_COUPONS.percent.toLowerCase())
    await apply.click()
    await expect(summary(page).getByText(`${SEED_COUPONS.percent} aplicado`).filter({ visible: true })).toBeVisible()
    // 1,19 − 10% + taxa da Ethereum (0,016) = 1,087
    await expect(summary(page).getByText('Total: 1,087 ether').filter({ visible: true })).toBeVisible()

    await summary(page)
      .getByRole('button', { name: `Remover cupom ${SEED_COUPONS.percent}` })
      .click()
    await expect(summary(page).getByText('Total: 1,206 ether').filter({ visible: true })).toBeVisible()
  })

  test('itens, quantidades e cupom persistem após refresh', async ({ app, page }) => {
    await app.open('/')
    await app.addToCartViaApi([
      { nftId: ape.id, editionId: ape.defaultEditionId, quantity: 2 },
      { nftId: SEED_NFTS.neonVessel.id, editionId: `${SEED_NFTS.neonVessel.id}--1-50`, quantity: 1 },
    ])
    await app.open('/carrinho')
    const code = summary(page).getByRole('textbox', { name: 'Código promocional' })
    await code.fill(SEED_COUPONS.percent)
    await summary(page).getByRole('button', { name: 'Aplicar', exact: true }).click()
    await expect(summary(page).getByText(`${SEED_COUPONS.percent} aplicado`).filter({ visible: true })).toBeVisible()
    // (2 × 1,19 + 1,99) − 10% + 0,016 de taxa
    const total = 'Total: 3,949 ether'
    await expect(summary(page).getByText(total).filter({ visible: true })).toBeVisible()

    await app.reload()
    await expect(line(page, APE).getByRole('status')).toHaveText(/^Quantidade: 2/)
    await expect(line(page, 'Neon Vessel #552')).toBeVisible()
    await expect(summary(page).getByText(`${SEED_COUPONS.percent} aplicado`).filter({ visible: true })).toBeVisible()
    await expect(summary(page).getByText(total).filter({ visible: true })).toBeVisible()
    await app.open('/')
    await expect(app.cartLink()).toHaveAccessibleName('Carrinho, 3 itens')
  })

  test('itens do visitante entram na conta depois do login (merge)', async ({ app, page }) => {
    await app.open(`/nft/${SEED_NFTS.goldenSignal.id}`)
    await buyFromDetail(page)
    await expect(line(page, 'Golden Signal #160')).toBeVisible()

    // "Conectar e finalizar" exige conta: o guard leva ao login e volta ao pagamento.
    await summary(page).getByRole('link', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fpagamento/)
    await app.loginViaUi(SEED_ACCOUNTS.bruno, { goToLogin: false })
    await expect(page).toHaveURL(/\/pagamento$/)

    await app.open('/')
    await expect(app.cartLink()).toHaveAccessibleName('Carrinho, 1 item')
    await app.open('/carrinho')
    await expect(line(page, 'Golden Signal #160')).toBeVisible()
    // Depois do merge o id de visitante é descartado: o refresh lê o carrinho da conta.
    await app.reload()
    await expect(line(page, 'Golden Signal #160')).toBeVisible()
  })
})
