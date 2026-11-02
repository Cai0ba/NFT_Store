import type { Page } from '@playwright/test'
import type { App } from './support/app'
import { CheckoutPage } from './support/checkout'
import { expect, SEED_ACCOUNTS, SEED_NFTS, SEED_WALLETS, test } from './support/fixtures'

const { ana, bruno } = SEED_ACCOUNTS
const EXPIRED_REASON = 'Sua sessão expirou. Entre novamente para continuar de onde parou.'

function registerForm(page: Page) {
  return page.locator('form').filter({ has: page.getByLabel('Confirmar senha') })
}

async function fillRegister(
  page: Page,
  values: { username: string; email: string; password: string; confirm?: string },
) {
  const form = registerForm(page)
  await form.getByLabel('Nome de usuário').fill(values.username)
  await form.getByLabel('E-mail').fill(values.email)
  await form.getByLabel('Senha', { exact: false }).first().fill(values.password)
  await form.getByLabel('Confirmar senha').fill(values.confirm ?? values.password)
  await form.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
}

function loginForm(page: Page) {
  return page.locator('form').filter({ has: page.getByRole('button', { name: 'Entrar', exact: true }) })
}

/** O token deste cenário vale 20 s; o relógio da página é adiantado em vez de esperar. */
async function expireSession(page: Page) {
  await page.clock.fastForward('00:25')
}

test.describe('Cadastro', () => {
  test('cadastro com sucesso já entra na conta nova', async ({ app, page, isMobile }) => {
    await app.open('/cadastro')
    await fillRegister(page, { username: 'carla.nova', email: 'carla@kurio.test', password: 'Colecao2026' })

    await expect(page).toHaveURL(/\/$/)
    await expect(app.toast(/^Conta criada\. Boas-vindas à Kurio/)).toBeVisible()
    await expect.poll(() => app.sessionUser()).not.toBeNull()
    if (!isMobile) await expect(page.getByRole('button', { name: /^Menu da conta de/ })).toBeVisible()
  })

  test('validação local: senha fraca e confirmação diferente', async ({ app, page }) => {
    await app.open('/cadastro')
    await fillRegister(page, { username: 'ab', email: 'sem-arroba', password: 'curta', confirm: 'outra' })

    const form = registerForm(page)
    await expect(form.getByLabel('Nome de usuário')).toHaveAttribute('aria-invalid', 'true')
    await expect(form.getByLabel('Nome de usuário')).toBeFocused()
    await expect(form.getByLabel('Nome de usuário')).toHaveAccessibleDescription('Use pelo menos 3 caracteres')
    await expect(form.getByLabel('E-mail')).toHaveAccessibleDescription('E-mail inválido')
    await expect(form.getByLabel('Senha', { exact: false }).first()).toHaveAccessibleDescription(
      'A senha precisa ter pelo menos 8 caracteres',
    )
    await expect(form.getByLabel('Confirmar senha')).toHaveAccessibleDescription('As senhas não conferem')
    expect(await app.sessionUser()).toBeNull()
  })

  test('conflito de e-mail e de nome de usuário vindo do servidor', async ({ app, page }) => {
    await app.open('/cadastro')
    const form = registerForm(page)

    await fillRegister(page, { username: 'outra.pessoa', email: ana.email, password: 'Colecao2026' })
    await expect(form.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true')
    await expect(form.getByLabel('E-mail')).toHaveAccessibleDescription('Este e-mail já está em uso')
    await expect(form.getByLabel('E-mail')).toBeFocused()

    await fillRegister(page, { username: ana.username, email: 'nova.pessoa@kurio.test', password: 'Colecao2026' })
    await expect(form.getByLabel('Nome de usuário')).toHaveAccessibleDescription('Este nome de usuário já está em uso')
    await expect(form.getByLabel('E-mail')).not.toHaveAttribute('aria-invalid', 'true')
    expect(await app.sessionUser()).toBeNull()
  })
})

test.describe('Login e redirecionamento', () => {
  test('campos obrigatórios são validados antes de chamar a API', async ({ app, page }) => {
    await app.open('/entrar')
    let loginCalls = 0
    page.on('request', (request) => {
      if (request.url().endsWith('/api/auth/login')) loginCalls += 1
    })
    const form = loginForm(page)
    await form.getByRole('button', { name: 'Entrar', exact: true }).click()

    await expect(form.getByLabel('E-mail')).toHaveAccessibleDescription('Informe o e-mail')
    await expect(form.getByLabel('Senha', { exact: false }).first()).toHaveAccessibleDescription('Informe a senha')
    await expect(form.getByLabel('E-mail')).toBeFocused()
    expect(loginCalls).toBe(0)
  })

  test('credenciais inválidas mostram alerta sem abrir sessão', async ({ app, page }) => {
    await app.open('/entrar')
    const form = loginForm(page)
    await form.getByLabel('E-mail').fill(ana.email)
    await form.getByLabel('Senha', { exact: false }).first().fill('SenhaErrada1')
    await form.getByRole('button', { name: 'Entrar', exact: true }).click()

    await expect(page.getByRole('alert').filter({ hasText: 'E-mail ou senha incorretos' })).toBeVisible()
    await expect(page).toHaveURL(/\/entrar/)
    expect(await app.sessionUser()).toBeNull()
  })

  test('rota privada leva ao login e volta para onde o usuário queria ir', async ({ app, page }) => {
    await app.open('/perfil/carteiras')
    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fperfil%2Fcarteiras/)

    await app.loginViaUi(ana, { goToLogin: false })
    await expect(page).toHaveURL(/\/perfil\/carteiras$/)
    await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()
  })
})

test.describe('Expiração de sessão', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install()
  })

  test('durante a navegação em rota privada: volta ao login com o motivo e retoma a página', async ({ app, page }) => {
    await app.open('/', { scenario: 'session-expiring' })
    await app.loginViaUi(ana)
    await app.open('/perfil')
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()

    await expireSession(page)

    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fperfil/)
    await expect(page.getByText(EXPIRED_REASON)).toBeVisible()
    await app.loginViaUi(ana, { goToLogin: false })
    await expect(page).toHaveURL(/\/perfil$/)
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
  })

  test('em rota pública: aviso discreto com atalho para entrar de novo', async ({ app, page }) => {
    await app.open('/', { scenario: 'session-expiring' })
    await app.loginViaUi(ana)
    await app.open(`/nft/${SEED_NFTS.emeraldApe.id}`)

    await expireSession(page)

    const banner = page.getByRole('status').filter({ hasText: EXPIRED_REASON })
    await expect(banner).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/nft/${SEED_NFTS.emeraldApe.id}$`))
    await banner.getByRole('link', { name: 'Entrar novamente' }).click()
    await app.loginViaUi(ana, { goToLogin: false })
    await expect(page).toHaveURL(new RegExp(`/nft/${SEED_NFTS.emeraldApe.id}$`))
  })

  test('durante o checkout: o rascunho do formulário sobrevive ao novo login', async ({ app, page, isMobile }) => {
    await app.open('/', { scenario: 'session-expiring' })
    await app.loginViaUi(ana)
    await app.addToCartViaApi([
      { nftId: SEED_NFTS.emeraldApe.id, editionId: SEED_NFTS.emeraldApe.defaultEditionId, quantity: 1 },
    ])
    const checkout = new CheckoutPage(page, isMobile)
    await app.open('/pagamento')
    await checkout.expectReady()
    await checkout.expandCollector()
    await checkout.field('Nome de exibição').fill('Ana em Viagem')
    await checkout.field('Observação do colecionador').fill('Enviar para a carteira de reserva depois')

    await expireSession(page)

    await expect(page).toHaveURL(/\/entrar\?redirect=%2Fpagamento/)
    await expect(page.getByText(EXPIRED_REASON)).toBeVisible()
    await app.loginViaUi(ana, { goToLogin: false })
    await expect(page).toHaveURL(/\/pagamento$/)
    await checkout.expectReady()
    await checkout.expandCollector()
    await expect(checkout.field('Nome de exibição')).toHaveValue('Ana em Viagem')
    await expect(checkout.field('Observação do colecionador')).toHaveValue('Enviar para a carteira de reserva depois')
  })
})

async function seedAnaPrivateData(app: App) {
  await app.addToCartViaApi([
    { nftId: SEED_NFTS.emeraldApe.id, editionId: SEED_NFTS.emeraldApe.defaultEditionId, quantity: 2 },
  ])
  await app.reload()
}

test.describe('Logout e troca de usuário', () => {
  test('logout limpa sessão, carrinho e favoritos da tela', async ({ app, page }) => {
    await app.open('/')
    await app.loginViaApi(ana)
    await seedAnaPrivateData(app)
    await expect(app.cartLink()).toHaveAccessibleName('Carrinho, 2 itens')
    await expect(page.getByRole('button', { name: 'Remover Emerald Ape #042 dos favoritos' })).toBeVisible()

    // Sair a partir de uma rota privada leva ao Início em vez de deixar a página órfã.
    await app.open('/perfil')
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
    await app.logoutViaUi()
    await expect(app.toast('Você saiu da sua conta.')).toBeVisible()
    await expect(page).toHaveURL(/\/$/)
    await app.open('/')
    await expect(app.cartLink()).toHaveAccessibleName('Carrinho vazio')
    await expect(page.getByRole('button', { name: 'Favoritar Emerald Ape #042' })).toBeVisible()
    await expect(page.getByRole('button', { name: /dos favoritos$/ })).toHaveCount(0)

    await app.open('/perfil/favoritos')
    await expect(page).toHaveURL(/\/entrar\?redirect=/)
  })

  test('bruno entra depois da ana e não vê favoritos, carrinho nem pedidos dela', async ({ app, page }) => {
    await app.open('/')
    await app.loginViaApi(ana)
    await app.addToCartViaApi([
      { nftId: SEED_NFTS.emeraldApe.id, editionId: `${SEED_NFTS.emeraldApe.id}--1-10`, quantity: 1 },
    ])
    const anaOrderId = await app.placeOrderViaApi(SEED_WALLETS.anaPrimary)
    await seedAnaPrivateData(app)
    await app.open('/perfil/favoritos')
    await expect(page.getByRole('heading', { name: /^Lista de interesse/ })).toHaveText(/\(3\)/)

    await app.logoutViaUi()
    await app.loginViaUi(bruno)

    await app.open('/perfil/favoritos')
    await expect(page.getByRole('heading', { name: 'Sua lista de interesse está vazia' })).toBeVisible()
    await expect(app.cartLink()).toHaveAccessibleName('Carrinho vazio')
    await app.open('/carrinho')
    await expect(page.getByRole('heading', { name: /carrinho está vazio/i })).toBeVisible()
    expect(await app.createdOrders()).toEqual([])
    await app.open(`/pedido/${anaOrderId}`)
    await expect(page.getByRole('heading', { name: 'Pedido não encontrado' })).toBeVisible()
    await app.open('/')
    await expect(page.getByRole('button', { name: /dos favoritos$/ })).toHaveCount(0)
  })
})
