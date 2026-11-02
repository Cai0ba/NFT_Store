import type { KurioMockControl } from './control'

declare global {
  interface Window {
    /** Controle da simulação (cenários, rede, tempo real, pagamentos); existe apenas com mocks ligados. */
    __kurio?: KurioMockControl
  }
}

export {}
