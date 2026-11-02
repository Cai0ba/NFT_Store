import { expect, type Page } from '@playwright/test'
import { SEED_ACCOUNTS, type ScenarioName } from '../../../src/mocks'
import type { KurioDriver } from './kurio'

export type SeedAccount = { id: string; email: string; password: string; username: string }
export { SEED_ACCOUNTS }

const SESSION_KEY = 'kurio.session'
const GUEST_CART_KEY = 'kurio.guestCartId'

/** O painel "Simulação" fica fora da interface avaliada e não pode interceptar cliques no canto da tela. */
export async function hideDevtools(page: Page) {
  await page.addInitScript(() => {
    const style = document.createElement('style')
    style.textContent = '[data-kurio-devtools]{display:none!important}'
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style), { once: true })
  })
}

export function withScenario(path: string, scenario?: ScenarioName) {
  if (!scenario) return path
  const [base = '/', hash] = path.split('#')
  const url = `${base}${base.includes('?') ? '&' : '?'}scenario=${scenario}`
  return hash ? `${url}#${hash}` : url
}

interface ApiResult<T> {
  status: number
  body: T
}

type CartLine = { nftId: string; editionId: string; quantity: number }

/**
 * Ações do usuário sem passar pela interface, para preparar o estado de um teste. As chamadas saem
 * do próprio navegador e são atendidas pelos handlers do MSW, como as da aplicação.
 */
export class App {
  constructor(
    readonly page: Page,
    readonly kurio: KurioDriver,
    readonly isMobile: boolean,
  ) {}

  async open(path = '/', options: { scenario?: ScenarioName } = {}) {
    await this.page.goto(withScenario(path, options.scenario))
    await this.kurio.ready()
  }

  async reload() {
    await this.page.reload()
    await this.kurio.ready()
  }

  private request<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    return this.page.evaluate(
      async ({ method, path, body, headers, sessionKey, guestKey }) => {
        const session = localStorage.getItem(sessionKey)
        const auth: Record<string, string> = {}
        if (session) auth.Authorization = `Bearer ${(JSON.parse(session) as { token: string }).token}`
        else {
          let guestId = localStorage.getItem(guestKey)
          if (!guestId) {
            guestId = JSON.stringify(`guest-e2e-${crypto.randomUUID()}`)
            localStorage.setItem(guestKey, guestId)
          }
          auth['X-Cart-Id'] = JSON.parse(guestId) as string
        }
        const response = await fetch(`/api${path}`, {
          method,
          headers: {
            Accept: 'application/json',
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...auth,
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
        })
        const text = await response.text()
        return { status: response.status, body: text ? (JSON.parse(text) as unknown) : null }
      },
      { method, path, body, headers, sessionKey: SESSION_KEY, guestKey: GUEST_CART_KEY },
    ) as Promise<ApiResult<T>>
  }

  /** Login direto na API simulada; a sessão é gravada como a aplicação grava e a página é recarregada. */
  async loginViaApi(account: SeedAccount) {
    const result = await this.request<unknown>('POST', '/auth/login', {
      email: account.email,
      password: account.password,
    })
    expect(result.status, 'login via API').toBe(200)
    await this.page.evaluate(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), {
      key: SESSION_KEY,
      session: result.body,
    })
    await this.reload()
  }

  async loginViaUi(account: SeedAccount, options: { goToLogin?: boolean } = {}) {
    if (options.goToLogin ?? true) await this.open('/entrar')
    const form = this.page
      .locator('form')
      .filter({ has: this.page.getByRole('button', { name: 'Entrar', exact: true }) })
    await form.getByLabel('E-mail').fill(account.email)
    await form.getByLabel('Senha', { exact: false }).first().fill(account.password)
    await form.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(this.page).not.toHaveURL(/\/entrar/)
    await expect.poll(() => this.sessionUser()).toBe(account.id)
  }

  sessionUser() {
    return this.page.evaluate((key) => {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as { user: { id: string } }).user.id : null
    }, SESSION_KEY)
  }

  async logoutViaUi() {
    if (this.isMobile) {
      await this.page
        .getByRole('navigation', { name: 'Navegação inferior' })
        .getByRole('link', { name: 'Perfil' })
        .click()
      await this.page.getByRole('button', { name: 'Sair' }).click()
    } else {
      await this.page.getByRole('button', { name: /^Menu da conta/ }).click()
      await this.page.getByRole('menuitem', { name: 'Sair' }).click()
    }
    await expect.poll(() => this.sessionUser()).toBeNull()
  }

  /** Carrinho de quem estiver na sessão (ou do visitante, pelo X-Cart-Id). Recarregue para a UI refletir. */
  async addToCartViaApi(lines: CartLine[]) {
    for (const line of lines) {
      const result = await this.request('POST', '/cart/items', line)
      expect(result.status, `POST /cart/items ${line.editionId}`).toBe(200)
    }
  }

  async catalogPage(query: string) {
    const result = await this.request<{ items: { name: string }[]; pagination: { total: number } }>(
      'GET',
      `/nfts${query}`,
    )
    return { names: result.body.items.map((item) => item.name), total: result.body.pagination.total }
  }

  /** Pedido completo pela API (carteira conectada, cotação atual, Idempotency-Key própria). */
  async placeOrderViaApi(walletId: string) {
    const network = 'ethereum'
    const connected = await this.request('POST', `/me/wallets/${walletId}/connection`, { network })
    expect(connected.status, 'conexão da carteira').toBe(200)
    const quote = await this.request<{ id: string; hash: string }>('GET', `/cart/quote?network=${network}`)
    const collector = {
      displayName: 'Ana Colecionadora',
      username: 'ana.colecionadora',
      network,
      profileName: 'ana.colecionadora',
      walletAddress: '0xA91F3b7C2d4E5f60718293A4b5C6d7E8f901E82C',
      ensOrSecondary: '',
      walletProvider: 'metamask',
      referralCode: 'KURIO26',
      email: 'ana@kurio.test',
      ensName: 'ana-kurio',
      ensSuffix: '.eth',
      useOtherWallet: false,
      note: '',
    }
    const order = await this.request<{ id: string }>(
      'POST',
      '/orders',
      { quoteId: quote.body.id, quoteHash: quote.body.hash, walletId, network, collector },
      { 'Idempotency-Key': `e2e-${Date.now()}-${Math.round(Math.random() * 1e6)}` },
    )
    expect(order.status, 'criação do pedido').toBe(202)
    return order.body.id
  }

  async createdOrders() {
    const result = await this.request<{ items: { id: string; status: string; idempotencyKey: string }[] }>(
      'GET',
      '/me/orders',
    )
    return result.body.items
  }

  /** Toast visual (sonner); o mesmo texto costuma ir também para a região aria-live. */
  toast(text: string | RegExp) {
    return this.page.getByRole('region', { name: /^Notificações/ }).getByText(text)
  }

  /** Link do carrinho no cabeçalho (desktop) ou na navegação inferior (mobile). */
  cartLink() {
    const scope = this.isMobile
      ? this.page.getByRole('navigation', { name: 'Navegação inferior' })
      : this.page.getByRole('banner')
    return scope.getByRole('link', { name: /^Carrinho/ })
  }
}
