import type { Locator, Page } from '@playwright/test'
import { CheckoutPage } from './support/checkout'
import { expect, SEED_ACCOUNTS, SEED_NFTS, test } from './support/fixtures'

function focusIsInside(container: Locator) {
  return container.evaluate((element) => element.contains(document.activeElement))
}

/** Percorre o diálogo com Tab e Shift+Tab e confere que o foco nunca escapa dele. */
async function expectFocusTrapped(page: Page, dialog: Locator, presses = 12) {
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let i = 0; i < presses; i += 1) {
      await page.keyboard.press(key)
      expect(await focusIsInside(dialog), `foco dentro do diálogo após ${key} #${i + 1}`).toBe(true)
    }
  }
}

test.describe('Navegação por teclado', () => {
  test('skip link leva ao conteúdo e Tab/Shift+Tab percorrem os cards na ordem', async ({ app, page, isMobile }) => {
    test.skip(isMobile, 'Teclado físico é cenário de desktop; o mobile cobre foco no sheet de filtros.')
    await app.open('/')
    await expect(page.getByRole('list', { name: 'NFTs' })).toBeVisible()

    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeInViewport()
    await page.keyboard.press('Enter')
    await expect(page.locator('main#conteudo')).toBeFocused()

    const grid = page.getByRole('list', { name: 'NFTs' })
    await grid.getByRole('link', { name: 'Emerald Ape #042' }).focus()
    await page.keyboard.press('Tab')
    await expect(grid.getByRole('button', { name: 'Adicionar Sage Nomad #009 ao carrinho' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(grid.getByRole('button', { name: 'Favoritar Sage Nomad #009' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(grid.getByRole('link', { name: 'Sage Nomad #009' })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(grid.getByRole('button', { name: 'Favoritar Sage Nomad #009' })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Shift+Tab')
    await expect(grid.getByRole('link', { name: 'Emerald Ape #042' })).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp(`/nft/${SEED_NFTS.emeraldApe.id}$`))
  })

  test('menu da conta abre, navega por setas e devolve o foco ao fechar', async ({ app, page, isMobile }) => {
    test.skip(isMobile, 'O menu da conta só existe no cabeçalho desktop.')
    await app.open('/')
    await app.loginViaApi(SEED_ACCOUNTS.ana)

    const trigger = page.getByRole('button', { name: 'Menu da conta de Ana Colecionadora' })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'Meu perfil' })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(menu.getByRole('menuitem', { name: 'Carteiras' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
    await expect(trigger).toBeFocused()
  })
})

test.describe('Foco em diálogos', () => {
  test('modal de login prende o foco e devolve ao gatilho ao fechar', async ({ app, page, isMobile }) => {
    test.skip(isMobile, 'No mobile o login é uma tela cheia, não um diálogo.')
    await app.open('/')
    const trigger = page.getByRole('banner').getByRole('link', { name: 'Entrar' })
    await trigger.focus()
    await page.keyboard.press('Enter')

    const dialog = page.getByRole('dialog', { name: 'Entrar na Kurio' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel('E-mail')).toBeFocused()
    await expectFocusTrapped(page, dialog)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/\/$/)
    await expect(trigger).toBeFocused()
  })

  test('sheet de filtros do mobile prende o foco e devolve ao botão', async ({ app, page, isMobile }) => {
    test.skip(!isMobile, 'Os filtros só viram sheet abaixo de 1024 px.')
    await app.open('/')
    const trigger = page.getByRole('button', { name: /^Filtros e ordenação/ })
    await trigger.click()

    const sheet = page.getByRole('dialog', { name: 'Filtros' })
    await expect(sheet).toBeVisible()
    expect(await focusIsInside(sheet)).toBe(true)
    await expectFocusTrapped(page, sheet, 8)

    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('revisão do pedido foca o título, prende o foco e volta ao botão de confirmar', async ({
    app,
    page,
    isMobile,
  }) => {
    await app.open('/')
    await app.loginViaApi(SEED_ACCOUNTS.ana)
    await app.addToCartViaApi([
      { nftId: SEED_NFTS.emeraldApe.id, editionId: SEED_NFTS.emeraldApe.defaultEditionId, quantity: 1 },
    ])
    await app.open('/pagamento')
    const checkout = new CheckoutPage(page, isMobile)
    await checkout.expectReady()
    await checkout.connectWallet()
    const submit = checkout.form.getByRole('button', { name: 'Confirmar compra' })
    await submit.focus()
    await page.keyboard.press('Enter')

    await expect(checkout.dialog.getByRole('heading', { name: 'Revise sua compra' })).toBeFocused()
    await expectFocusTrapped(page, checkout.dialog, 6)

    await page.keyboard.press('Escape')
    await expect(checkout.dialog).toBeHidden()
    await expect(submit).toBeFocused()
  })
})

test.describe('Validação acessível de formulários', () => {
  test('pagamento: foco no primeiro campo inválido e mensagens associadas', async ({ app, page, isMobile }) => {
    await app.open('/')
    await app.loginViaApi(SEED_ACCOUNTS.ana)
    await app.addToCartViaApi([
      { nftId: SEED_NFTS.emeraldApe.id, editionId: SEED_NFTS.emeraldApe.defaultEditionId, quantity: 1 },
    ])
    await app.open('/pagamento')
    const checkout = new CheckoutPage(page, isMobile)
    await checkout.expectReady()
    await checkout.expandCollector()

    await checkout.field('Nome de exibição').fill('')
    await checkout.field('E-mail').fill('ana@')
    await checkout.field('Código de indicação').fill('!')
    // No mobile o bloco recolhe de novo para mostrar que o submit o reabre sozinho.
    if (isMobile) await checkout.form.getByRole('button', { name: /^Dados do colecionador/ }).click()
    await checkout.submit()

    const name = checkout.field('Nome de exibição')
    await expect(name).toBeFocused()
    await expect(name).toHaveAttribute('aria-invalid', 'true')
    await expect(name).toHaveAccessibleDescription('Informe o nome de exibição')
    await expect(checkout.field('E-mail')).toHaveAccessibleDescription('E-mail inválido')
    await expect(checkout.field('Código de indicação')).toHaveAccessibleDescription(
      'Código de indicação inválido (4 a 12 letras ou números)',
    )
    if (isMobile)
      await expect(checkout.form.getByRole('button', { name: /^Dados do colecionador/ })).toContainText(
        '3 campos precisam de atenção',
      )
    await expect(checkout.dialog).toBeHidden()

    // Corrigir o campo remove o erro e a associação.
    await name.fill('Ana Colecionadora')
    await name.press('Tab')
    await expect(name).not.toHaveAttribute('aria-invalid', 'true')
    await expect(name).toHaveAccessibleDescription('')
  })

  test('login só pelo teclado: Enter envia e o erro de credencial recebe o foco', async ({ app, page }) => {
    await app.open('/entrar')
    const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Entrar', exact: true }) })
    await form.getByLabel('E-mail').fill(SEED_ACCOUNTS.ana.email)
    await form.getByLabel('Senha', { exact: false }).first().fill('Errada123')
    await form.getByLabel('Senha', { exact: false }).first().press('Enter')

    const alert = page.getByRole('alert').filter({ hasText: 'E-mail ou senha incorretos' })
    await expect(alert).toBeFocused()
    await expect(form).toHaveAccessibleDescription(/E-mail ou senha incorretos/)
  })
})
