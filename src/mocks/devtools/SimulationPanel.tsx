import { FlaskConical, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react'
import { percentOfEth } from '@/shared/lib/money'
import { cn } from '@/shared/lib/cn'
import type { LatencyProfile, PaymentOutcome } from '../config'
import { mockControl, panelVisibility } from '../control'
import { db } from '../db/store'
import { SCENARIOS, SCENARIO_NAMES, type ScenarioName } from '../scenarios'

const PANEL_EVENT = 'kurio:mock-panel'

function subscribeVisibility(callback: () => void) {
  window.addEventListener(PANEL_EVENT, callback)
  return () => window.removeEventListener(PANEL_EVENT, callback)
}

const buttonClass =
  'inline-flex min-h-9 items-center justify-center rounded-sm border border-border-soft bg-surface-raised px-3 text-xs font-medium text-foreground transition-colors hover:border-text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent disabled:opacity-50'
const primaryButtonClass =
  'inline-flex min-h-9 items-center justify-center rounded-sm bg-primary px-3 text-xs font-bold text-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent'
const fieldClass =
  'w-full rounded-sm border border-field-border bg-ink px-2 py-1.5 text-xs text-foreground placeholder:text-secondary focus-visible:outline-2 focus-visible:outline-text-accent'
const labelClass = 'mb-1 block text-xs text-text-secondary'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border pt-3">
      <h3 className="mb-2 text-xs font-bold tracking-wide text-text-accent uppercase">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

interface CartEntry {
  nftId: string
  label: string
}

/** NFTs dos carrinhos mais recentes primeiro: na demo é o carrinho que está aberto na outra aba/janela. */
function cartEntries(): CartEntry[] {
  const seen = new Set<string>()
  const entries: CartEntry[] = []
  const carts = [...db.state.carts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  for (const item of carts.flatMap((c) => c.items)) {
    const nft = db.state.nfts.find((n) => n.id === item.nftId)
    if (!nft || seen.has(nft.id)) continue
    seen.add(nft.id)
    entries.push({ nftId: nft.id, label: nft.name })
  }
  return entries
}

function useAction(setStatus: (message: string) => void) {
  return async (message: string, action: () => void | Promise<void>) => {
    try {
      await action()
      setStatus(message)
    } catch (error) {
      setStatus(error instanceof Error ? `Falhou: ${error.message}` : 'Falhou.')
    }
  }
}

function ScenarioSection({ run }: { run: ReturnType<typeof useAction> }) {
  const id = useId()
  const [scenario, setScenario] = useState<ScenarioName>(mockControl.scenario())
  const definition = SCENARIOS[scenario]
  return (
    <Section title="Cenário">
      <label htmlFor={`${id}-scenario`} className={labelClass}>
        Cenário ativo
      </label>
      <select
        id={`${id}-scenario`}
        className={fieldClass}
        value={scenario}
        aria-describedby={`${id}-scenario-hint`}
        onChange={(e) => setScenario(e.target.value as ScenarioName)}
      >
        {SCENARIO_NAMES.map((name) => (
          <option key={name} value={name}>
            {SCENARIOS[name].label}
          </option>
        ))}
      </select>
      <p id={`${id}-scenario-hint`} className="text-xs text-text-secondary">
        {definition.description} Aplicar restaura os dados iniciais do cenário.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={primaryButtonClass}
          onClick={() =>
            run('Recarregando com o novo cenário…', async () => {
              await mockControl.reset(scenario)
              window.location.reload()
            })
          }
        >
          Aplicar e recarregar
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() =>
            run('Dados restaurados. Recarregando…', async () => {
              await mockControl.reset()
              window.location.reload()
            })
          }
        >
          Resetar dados
        </button>
      </div>
    </Section>
  )
}

function NftEventSection({ run }: { run: ReturnType<typeof useAction> }) {
  const id = useId()
  const entries = cartEntries()
  const [nftId, setNftId] = useState(entries[0]?.nftId ?? '')
  const [editionId, setEditionId] = useState('')
  const [price, setPrice] = useState('')
  const [available, setAvailable] = useState('')
  const nft = db.state.nfts.find((n) => n.id === nftId.trim())
  const edition = nft?.editions.find((e) => e.id === editionId) ?? nft?.editions.find((e) => e.id === nft.defaultEditionId)

  const target = () => {
    if (!nft || !edition) throw new Error('Informe um NFT existente')
    return { nftId: nft.id, editionId: edition.id }
  }

  const apply = () =>
    run('Atualização enviada pelo servidor.', () => {
      mockControl.realtime.updateNft({
        ...target(),
        ...(price.trim() ? { priceEth: price.trim() } : {}),
        ...(available.trim() ? { available: Number(available) } : {}),
      })
    })

  return (
    <Section title="NFT no carrinho">
      {entries.length > 0 ? (
        <div>
          <label htmlFor={`${id}-pick`} className={labelClass}>
            NFTs nos carrinhos
          </label>
          <select id={`${id}-pick`} className={fieldClass} value={nftId} onChange={(e) => setNftId(e.target.value)}>
            {entries.map((entry) => (
              <option key={entry.nftId} value={entry.nftId}>
                {entry.label}
              </option>
            ))}
            {!entries.some((e) => e.nftId === nftId) && <option value={nftId}>Outro: {nftId || '—'}</option>}
          </select>
        </div>
      ) : (
        <p className="text-xs text-text-secondary">Nenhum carrinho com itens. Informe o id do NFT.</p>
      )}
      <div>
        <label htmlFor={`${id}-id`} className={labelClass}>
          Id do NFT
        </label>
        <input id={`${id}-id`} className={fieldClass} value={nftId} onChange={(e) => setNftId(e.target.value)} placeholder="emerald-ape-042" />
      </div>
      {nft && (
        <div>
          <label htmlFor={`${id}-edition`} className={labelClass}>
            Edição
          </label>
          <select id={`${id}-edition`} className={fieldClass} value={edition?.id ?? ''} onChange={(e) => setEditionId(e.target.value)}>
            {nft.editions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label} · {e.priceEth} ETH · {e.available} disp.
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={`${id}-price`} className={labelClass}>
            Novo preço (ETH)
          </label>
          <input id={`${id}-price`} inputMode="decimal" className={fieldClass} value={price} onChange={(e) => setPrice(e.target.value)} placeholder={edition?.priceEth} />
        </div>
        <div>
          <label htmlFor={`${id}-available`} className={labelClass}>
            Disponível
          </label>
          <input id={`${id}-available`} inputMode="numeric" className={fieldClass} value={available} onChange={(e) => setAvailable(e.target.value)} placeholder={edition ? String(edition.available) : ''} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primaryButtonClass} onClick={apply}>
          Aplicar
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={!edition}
          onClick={() => run('Preço aumentado em 10%.', () => mockControl.realtime.updateNft({ ...target(), priceEth: percentOfEth(edition?.priceEth ?? '0', 110) }))}
        >
          Preço +10%
        </button>
        <button type="button" className={buttonClass} disabled={!edition} onClick={() => run('Edição esgotada.', () => mockControl.realtime.updateNft({ ...target(), available: 0 }))}>
          Esgotar
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass} disabled={!nft} onClick={() => run('Último evento reenviado (mesmo eventId).', () => mockControl.realtime.replayLast(target().nftId))}>
          Duplicar último evento
        </button>
        <button type="button" className={buttonClass} disabled={!nft} onClick={() => run('Evento com versão antiga enviado.', () => mockControl.realtime.emitStale(target().nftId))}>
          Enviar evento antigo
        </button>
      </div>
    </Section>
  )
}

function ConnectionSection({ run }: { run: ReturnType<typeof useAction> }) {
  const paused = mockControl.realtime.isPaused()
  return (
    <Section title="Tempo real">
      <p className="text-xs text-text-secondary">
        {mockControl.realtime.connections()} conexão(ões) ativa(s){paused ? ' · servidor pausado' : ''}.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass} onClick={() => run('Conexões derrubadas; o cliente deve reconectar.', mockControl.realtime.disconnect)}>
          Derrubar conexão
        </button>
        {paused ? (
          <button type="button" className={buttonClass} onClick={() => run('Tempo real retomado.', mockControl.realtime.resume)}>
            Retomar tempo real
          </button>
        ) : (
          <button type="button" className={buttonClass} onClick={() => run('Tempo real pausado: reconexões serão recusadas.', mockControl.realtime.pause)}>
            Pausar tempo real
          </button>
        )}
      </div>
    </Section>
  )
}

const OUTCOME_LABEL: Record<PaymentOutcome, string> = { confirm: 'Confirmar', reject: 'Recusar', hold: 'Manter pendente' }

function PaymentSection({ run }: { run: ReturnType<typeof useAction> }) {
  const id = useId()
  const { outcome } = mockControl.payments.get()
  const pending = db.state.orders.filter((o) => o.status === 'pending').length
  return (
    <Section title="Pagamento">
      <fieldset>
        <legend className={labelClass}>Desfecho dos próximos pagamentos</legend>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(OUTCOME_LABEL) as PaymentOutcome[]).map((value) => (
            <label key={value} className="flex items-center gap-1.5 text-xs text-foreground">
              <input
                type="radio"
                name={`${id}-outcome`}
                className="accent-primary"
                checked={outcome === value}
                onChange={() => run(`Desfecho definido: ${OUTCOME_LABEL[value]}.`, () => mockControl.payments.setOutcome(value))}
              />
              {OUTCOME_LABEL[value]}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-text-secondary">{pending} pedido(s) pendente(s).</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={buttonClass} disabled={pending === 0} onClick={() => run('Pedidos pendentes confirmados.', () => mockControl.payments.settle('confirm'))}>
          Confirmar pendentes
        </button>
        <button type="button" className={buttonClass} disabled={pending === 0} onClick={() => run('Pedidos pendentes recusados.', () => mockControl.payments.settle('reject'))}>
          Recusar pendentes
        </button>
      </div>
    </Section>
  )
}

const LATENCY_LABEL: Record<LatencyProfile, string> = { none: 'Sem atraso', fast: 'Rápida', slow: 'Lenta', variable: 'Variável' }

function NetworkSection({ run }: { run: ReturnType<typeof useAction> }) {
  const id = useId()
  const network = mockControl.network.get()
  return (
    <Section title="Rede">
      <label htmlFor={`${id}-latency`} className={labelClass}>
        Latência
      </label>
      <select
        id={`${id}-latency`}
        className={fieldClass}
        value={network.latency}
        onChange={(e) => run('Latência atualizada.', () => mockControl.network.set({ latency: e.target.value as LatencyProfile }))}
      >
        {(Object.keys(LATENCY_LABEL) as LatencyProfile[]).map((value) => (
          <option key={value} value={value}>
            {LATENCY_LABEL[value]}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-xs text-foreground">
        <input
          type="checkbox"
          className="accent-primary"
          checked={network.offline}
          onChange={(e) => run(e.target.checked ? 'Rede desligada.' : 'Rede religada.', () => mockControl.network.set({ offline: e.target.checked }))}
        />
        Simular falta de conexão
      </label>
    </Section>
  )
}

function focusables(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])')].filter(
    (el) => !el.hasAttribute('disabled'),
  )
}

function PanelDialog({ onClose }: { onClose(): void }) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState('')
  const [, setRevision] = useState(0)
  const run = useAction((message) => {
    setStatus(message)
    setRevision((r) => r + 1)
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog) focusables(dialog)[0]?.focus()
  }, [])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key !== 'Tab' || !dialogRef.current) return
    const items = focusables(dialogRef.current)
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      className="fixed bottom-24 left-4 z-[70] flex max-h-[min(640px,calc(100dvh-8rem))] w-[min(360px,calc(100vw-2rem))] flex-col rounded-md border border-border bg-surface-card text-foreground shadow-card md:bottom-4"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 id={titleId} className="text-sm font-bold">
            Simulação
          </h2>
          <p className="text-xs text-text-secondary">Controla o servidor simulado (MSW + Socket.IO).</p>
        </div>
        <button type="button" className={cn(buttonClass, 'min-h-8 px-2')} onClick={onClose} aria-label="Fechar painel de simulação">
          <X className="size-4" aria-hidden="true" />
        </button>
      </header>
      <div className="space-y-3 overflow-y-auto px-4 py-3">
        <ScenarioSection run={run} />
        <NftEventSection run={run} />
        <ConnectionSection run={run} />
        <PaymentSection run={run} />
        <NetworkSection run={run} />
      </div>
      <p role="status" aria-live="polite" className="min-h-9 border-t border-border px-4 py-2 text-xs text-text-accent">
        {status}
      </p>
    </div>
  )
}

export function SimulationPanel() {
  const hidden = useSyncExternalStore(subscribeVisibility, panelVisibility.isHidden)
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  if (hidden) return null
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className="fixed bottom-24 left-4 z-[60] inline-flex items-center gap-1.5 rounded-pill border border-border-soft bg-surface-card/90 px-3 py-1.5 text-xs font-medium text-text-secondary shadow-card backdrop-blur transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent md:bottom-4"
      >
        <FlaskConical className="size-3.5" aria-hidden="true" />
        Simulação
      </button>
      {open && <PanelDialog onClose={close} />}
    </>
  )
}
