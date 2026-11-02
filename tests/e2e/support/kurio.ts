// Os tipos de src/mocks leem import.meta.env; o projeto TS dos testes não inclui src/ por padrão.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../src/vite-env.d.ts" />
import { expect, type Page } from '@playwright/test'
import type { KurioMockControl, NetworkConfig, NftChange, PaymentOutcome, ScenarioName } from '../../../src/mocks'

declare global {
  interface Window {
    __kurio?: KurioMockControl
  }
}

/**
 * Wrapper  tipado de `window.__kurio`. Tudo roda dentro da página: os eventos de tempo real saem do
 * servidor simulado pelo socket.io-client real, e as mudanças de dados passam pelo mesmo "banco" do REST.
 */
export class KurioDriver {
  constructor(private readonly page: Page) {}

  /** O worker do MSW sobe antes do React; sem ele nenhuma chamada deve sair. */
  async ready() {
    // Durante o boot a página ainda pode trocar de documento; nesse caso só tentamos de novo.
    const isReady = () => this.page.evaluate(() => window.__kurio !== undefined).catch(() => false)
    await expect.poll(isReady, { message: 'mocks prontos' }).toBe(true)
  }

  scenario() {
    return this.page.evaluate(() => (window.__kurio as KurioMockControl).scenario())
  }

  /** Troca o cenário em tempo de execução (rede e pagamentos valem na hora; seed só após reset). */
  async setScenario(name: ScenarioName) {
    await this.page.evaluate((scenario) => (window.__kurio as KurioMockControl).setScenario(scenario), name)
  }

  async reset(name?: ScenarioName) {
    await this.page.evaluate((scenario) => (window.__kurio as KurioMockControl).reset(scenario), name)
  }

  readonly network = {
    set: (config: Partial<NetworkConfig>) =>
      this.page.evaluate((patch) => (window.__kurio as KurioMockControl).network.set(patch), config),
    get: () => this.page.evaluate(() => (window.__kurio as KurioMockControl).network.get()),
  }

  readonly realtime = {
    updateNft: (change: NftChange) =>
      this.page.evaluate((input) => (window.__kurio as KurioMockControl).realtime.updateNft(input), change),
    replayLast: (nftId: string) =>
      this.page.evaluate((id) => (window.__kurio as KurioMockControl).realtime.replayLast(id), nftId),
    emitStale: (nftId: string) =>
      this.page.evaluate((id) => (window.__kurio as KurioMockControl).realtime.emitStale(id), nftId),
    disconnect: () => this.page.evaluate(() => (window.__kurio as KurioMockControl).realtime.disconnect()),
    pause: () => this.page.evaluate(() => (window.__kurio as KurioMockControl).realtime.pause()),
    resume: () => this.page.evaluate(() => (window.__kurio as KurioMockControl).realtime.resume()),
    connections: () => this.page.evaluate(() => (window.__kurio as KurioMockControl).realtime.connections()),
    /** Evento disparado antes do handshake se perde; os testes esperam o socket da sessão atual. */
    waitForConnection: async ({ timeout = 10_000 }: { timeout?: number } = {}) => {
      await expect
        .poll(() => this.page.evaluate(() => (window.__kurio as KurioMockControl).realtime.connections()), {
          message: 'socket conectado ao servidor simulado',
          timeout,
        })
        .toBeGreaterThan(0)
    },
  }

  readonly payments = {
    setOutcome: (outcome: PaymentOutcome) =>
      this.page.evaluate((value) => (window.__kurio as KurioMockControl).payments.setOutcome(value), outcome),
    settle: (outcome: 'confirm' | 'reject') =>
      this.page.evaluate((value) => (window.__kurio as KurioMockControl).payments.settle(value), outcome),
    setDelay: (ms: number) =>
      this.page.evaluate((value) => (window.__kurio as KurioMockControl).payments.setDelay(value), ms),
    get: () => this.page.evaluate(() => (window.__kurio as KurioMockControl).payments.get()),
  }
}
