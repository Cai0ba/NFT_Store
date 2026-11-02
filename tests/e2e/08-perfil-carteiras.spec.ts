import type { Page } from '@playwright/test'
import { expect, SEED_ACCOUNTS, test } from './support/fixtures'
import { solidPng } from './support/png'

const { ana, bruno } = SEED_ACCOUNTS

function profileForm(page: Page) {
  return page.getByRole('form', { name: 'Perfil do colecionador' })
}

async function save(page: Page) {
  await profileForm(page).getByRole('button', { name: 'Salvar' }).click()
}

test.describe('Perfil, avatar e senha', () => {
  test.beforeEach(async ({ app, page }) => {
    await app.open('/')
    await app.loginViaApi(ana)
    await app.open('/perfil')
    await expect(profileForm(page).getByLabel('Nome de exibição')).toHaveValue('Ana Colecionadora')
  })

  test('edição do perfil persiste após refresh e atualiza o cabeçalho', async ({ app, page, isMobile }) => {
    const form = profileForm(page)
    await form.getByLabel('Nome de exibição').fill('Ana Souza')
    await form.getByLabel('Apelido da carteira').fill('Cofre da Ana')
    await save(page)
    await expect(app.toast('Perfil atualizado.')).toBeVisible()

    await app.reload()
    await expect(form.getByLabel('Nome de exibição')).toHaveValue('Ana Souza')
    await expect(form.getByLabel('Apelido da carteira')).toHaveValue('Cofre da Ana')
    if (!isMobile) await expect(page.getByRole('button', { name: 'Menu da conta de Ana Souza' })).toBeVisible()
  })

  test('validação local e conflito de e-mail ficam no campo, com foco', async ({ page }) => {
    const form = profileForm(page)
    await form.getByLabel('Nome de exibição').fill('')
    await save(page)
    await expect(form.getByLabel('Nome de exibição')).toBeFocused()
    await expect(form.getByLabel('Nome de exibição')).toHaveAccessibleDescription('Informe o nome de exibição')

    await form.getByLabel('Nome de exibição').fill('Ana Colecionadora')
    await form.getByLabel('E-mail').fill(bruno.email)
    await save(page)
    await expect(form.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true')
    await expect(form.getByLabel('E-mail')).toHaveAccessibleDescription('Este e-mail já está em uso')
    await expect(form.getByLabel('E-mail')).toBeFocused()
  })

  test('avatar: envio de PNG, formato inválido e remoção', async ({ app, page }) => {
    const avatar = page.getByRole('group', { name: 'Avatar' })
    const input = avatar.locator('input[type="file"]')
    await expect(avatar.getByText('Sem foto de perfil')).toBeAttached()

    await input.setInputFiles({ name: 'avatar.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') })
    await expect(avatar.getByRole('alert')).toHaveText('Formato não suportado. Use PNG, JPEG ou WebP.')

    await input.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: solidPng(320, 240, [210, 138, 76]) })
    await expect(app.toast('Foto de perfil atualizada.')).toBeVisible()
    const photo = avatar.getByRole('img', { name: 'Sua foto de perfil atual' })
    await expect(photo).toHaveAttribute('src', /^data:image\/(webp|jpeg);base64,/)
    await expect(avatar.getByRole('alert')).toHaveCount(0)

    await app.reload()
    await expect(photo).toBeVisible()

    await avatar.getByRole('button', { name: 'Remover foto de perfil' }).click()
    await expect(app.toast('Foto de perfil removida.')).toBeVisible()
    await expect(avatar.getByText('Sem foto de perfil')).toBeAttached()
    await expect(avatar.getByRole('button', { name: 'Remover foto de perfil' })).toBeDisabled()
  })

  test('senha: atual errada é recusada; a troca vale para o próximo login', async ({ app, page }) => {
    const form = profileForm(page)
    await form.getByLabel('Senha atual', { exact: true }).fill('SenhaErrada1')
    await form.getByLabel('Nova senha', { exact: true }).fill('NovaSenha2026')
    await form.getByLabel('Confirmar nova senha', { exact: true }).fill('NovaSenha2026')
    await save(page)
    await expect(form.getByLabel('Senha atual', { exact: true })).toHaveAttribute('aria-invalid', 'true')
    await expect(form.getByLabel('Senha atual', { exact: true })).toBeFocused()

    await form.getByLabel('Senha atual', { exact: true }).fill(ana.password)
    await save(page)
    await expect(app.toast('Senha alterada.')).toBeVisible()
    await expect(form.getByLabel('Senha atual', { exact: true })).toHaveValue('')

    await app.logoutViaUi()
    await app.loginViaUi({ ...ana, password: 'NovaSenha2026' })
  })
})

test.describe('Carteiras', () => {
  test('edição da principal valida endereço e campos e persiste', async ({ app, page }) => {
    await app.open('/')
    await app.loginViaApi(ana)
    await app.open('/perfil/carteiras')

    const primary = page.getByRole('region', { name: 'Carteira principal' })
    await primary.getByRole('button', { name: 'Editar' }).click()
    const form = page.getByRole('form', { name: 'Formulário da carteira principal' })
    await expect(form.getByLabel('Nome de exibição')).toBeFocused()

    await form.getByLabel('Apelido da carteira').fill('')
    await form.getByLabel('Endereço da carteira').fill('0x123')
    await form.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(form.getByLabel('Apelido da carteira')).toBeFocused()
    await expect(form.getByLabel('Apelido da carteira')).toHaveAccessibleDescription('Informe o apelido da carteira')
    await expect(form.getByLabel('Endereço da carteira')).toHaveAccessibleDescription(
      'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais',
    )

    const address = '0x1111222233334444555566667777888899990000'
    await form.getByLabel('Apelido da carteira').fill('Cofre frio')
    await form.getByLabel('Endereço da carteira').fill(address)
    await form.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(app.toast('Carteira principal salva.')).toBeVisible()
    await expect(form).toBeHidden()
    await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeFocused()

    await app.reload()
    await expect(primary.getByText('Cofre frio')).toBeVisible()
    await expect(primary.getByTitle(address)).toBeVisible()
  })

  test('conta sem carteiras cadastra a principal e espelha na secundária', async ({ app, page }) => {
    await app.open('/')
    await app.loginViaApi(bruno)
    await app.open('/perfil/carteiras')

    const sameAsPrimary = page.getByRole('checkbox', { name: 'Igual à carteira principal' })
    await expect(sameAsPrimary).toBeDisabled()
    await expect(sameAsPrimary).toHaveAccessibleDescription(
      'Cadastre a carteira principal para poder espelhá-la na secundária.',
    )

    const form = page.getByRole('form', { name: 'Formulário da carteira principal' })
    await form.getByLabel('Endereço da carteira').fill('0xABCDEFabcdef0123456789ABCDEFabcdef012345')
    await form.getByLabel('Código de indicação').fill('BRUNO26')
    await form.getByRole('textbox', { name: /^Nome ENS/ }).fill('bruno-nft')
    await form.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(form.getByRole('combobox', { name: /^Rede/ })).toHaveAccessibleDescription('Selecione uma rede')
    await expect(form.getByRole('combobox', { name: /^Tipo de carteira/ })).toHaveAccessibleDescription(
      'Selecione o tipo de carteira',
    )

    await form.getByRole('combobox', { name: /^Rede/ }).click()
    await page.getByRole('option', { name: 'Polygon' }).click()
    await form.getByRole('combobox', { name: /^Tipo de carteira/ }).click()
    await page.getByRole('option', { name: 'Coinbase Wallet' }).click()
    await form.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(app.toast('Carteira principal salva.')).toBeVisible()

    await expect(sameAsPrimary).toBeEnabled()
    // Checkbox controlado pela mutation: o estado só vira depois da resposta, então clique + expect.
    await sameAsPrimary.click()
    await expect(sameAsPrimary).toBeChecked()
    await expect(app.toast('A carteira secundária agora é igual à principal.')).toBeVisible()
    await app.reload()
    await expect(page.getByText(/A carteira secundária usa os mesmos dados da principal/)).toBeVisible()
    await expect(page.getByRole('checkbox', { name: 'Igual à carteira principal' })).toBeChecked()
  })
})
