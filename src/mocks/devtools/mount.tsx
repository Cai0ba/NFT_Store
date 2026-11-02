import { createRoot } from 'react-dom/client'
import { SimulationPanel } from './SimulationPanel'

const ROOT_ID = 'kurio-simulation-panel'

/** Root React separado: o painel não participa da árvore, do roteador nem do cache da aplicação. */
export function mountSimulationPanel() {
  if (document.getElementById(ROOT_ID)) return
  const host = document.createElement('div')
  host.id = ROOT_ID
  host.dataset.kurioDevtools = ''
  document.body.appendChild(host)
  createRoot(host).render(<SimulationPanel />)
}
