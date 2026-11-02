import { expect, type Page } from '@playwright/test'

/** Data fixa usada nas telas de regressão visual (o rodapé, recibos e sessões dependem do relógio). */
export const FROZEN_NOW = new Date('2026-10-30T15:00:00-03:00')

/**
 * Deixa a página pronta para comparar pixels: fontes carregadas, imagens (inclusive as lazy, que um
 * screenshot de página inteira não faria rolar) decodificadas e nenhum skeleton ou atualização em curso.
 */
export async function settleForScreenshot(page: Page) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await page.evaluate(async () => {
    const images = Array.from(document.images)
    // decoding="async" deixa o Chromium descartar e redecodificar imagens grandes entre capturas,
    // e o screenshot de página inteira pegava o hero ora pintado, ora vazio.
    for (const image of images) {
      image.loading = 'eager'
      image.decoding = 'sync'
    }
    await Promise.all(
      images.map((image) =>
        image.complete && image.naturalWidth > 0
          ? image.decode().catch(() => undefined)
          : new Promise<void>((resolve) => {
              image.addEventListener('load', () => resolve(), { once: true })
              image.addEventListener('error', () => resolve(), { once: true })
            }),
      ),
    )
  })
  await expect(page.locator('.skeleton:visible')).toHaveCount(0)
  await expect(page.locator('[aria-busy="true"]:visible')).toHaveCount(0)
  await expect
    .poll(() =>
      page.evaluate(() => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0)),
    )
    .toBe(true)
  await page.evaluate(() => window.scrollTo(0, 0))
}
