import { Link } from '@tanstack/react-router'
import { ArrowRight, CircleAlert, CircleX, RotateCw, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { truncateAddress } from '@/components/common/EthAddress'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { SpinnerIcon } from '@/components/ui/spinner'
import { getErrorMessage } from '@/api/errors'
import { OrderSummary } from '@/features/cart/components/OrderSummary'
import type { UseCheckoutResult } from '@/features/checkout/use-checkout'
import {
  NETWORK_LABEL,
  WALLET_PROVIDER_LABEL,
  type CartItem,
  type Quote,
  type Wallet,
} from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'
import { compareEth, formatEth, formatEthForScreenReader } from '@/shared/lib/money'

type CheckoutDialogProps = {
  checkout: UseCheckoutResult
  wallet: Wallet | null
  items: CartItem[]
  onEdit: () => void
  onRetryAfterRejection: () => void
}

type View = 'loading' | 'review' | 'pending' | 'rejected' | 'error'

function viewFor(checkout: UseCheckoutResult): View | null {
  switch (checkout.phase) {
    case 'editing':
    case 'confirmed':
      return null
    case 'revalidating':
      return checkout.quote && checkout.input ? 'review' : 'loading'
    case 'reviewing':
    case 'quote-changed':
    case 'submitting':
      return 'review'
    case 'pending':
      return 'pending'
    case 'rejected':
      return 'rejected'
    case 'error':
      return 'error'
  }
}

const titleClass = 'text-lg leading-6 font-bold text-foreground outline-none md:text-xl'

/**
 * Etapa de revisão e acompanhamento do envio. O diálogo segue as fases do `useCheckout`: revisão,
 * mudança de cotação (exige aceite), envio, aguardando a rede, recusa e erro.
 */
export function CheckoutDialog({ checkout, wallet, items, onEdit, onRetryAfterRejection }: CheckoutDialogProps) {
  const view = viewFor(checkout)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const locked = checkout.phase === 'submitting' || checkout.phase === 'revalidating' || checkout.phase === 'pending'

  // Troca de etapa remove o botão que tinha o foco; o título da nova etapa assume.
  useEffect(() => {
    if (view && view !== 'loading') titleRef.current?.focus()
  }, [view])

  return (
    <Dialog
      open={view !== null}
      onOpenChange={(open) => {
        if (!open && !locked) onEdit()
      }}
    >
      <DialogContent
        accentEdge
        showClose={!locked}
        closeLabel="Fechar e voltar a editar"
        onEscapeKeyDown={(event) => locked && event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        className="max-w-[640px] gap-0 px-5 pt-8 pb-6 sm:px-10"
      >
        {view === 'loading' ? (
          <div role="status" className="flex flex-col items-center gap-4 py-10 text-center">
            <SpinnerIcon className="size-10 text-text-accent" />
            <DialogTitle className={titleClass}>Validando sua compra…</DialogTitle>
            <DialogDescription>Conferindo preços, disponibilidade, cupom e taxas com o servidor.</DialogDescription>
          </div>
        ) : null}

        {view === 'review' && checkout.quote && checkout.input ? (
          <ReviewStep checkout={checkout} quote={checkout.quote} wallet={wallet} items={items} onEdit={onEdit} titleRef={titleRef} />
        ) : null}

        {view === 'pending' ? (
          <div role="status" className="flex flex-col items-center gap-4 py-6 text-center">
            <SpinnerIcon className="size-12 text-text-accent" />
            <DialogTitle ref={titleRef} tabIndex={-1} className={titleClass}>
              Aguardando confirmação da rede…
            </DialogTitle>
            <DialogDescription className="max-w-md text-sm leading-6">
              Pedido enviado{checkout.orderId ? ` (${checkout.orderId})` : ''}. A confirmação costuma levar poucos segundos. É seguro
              recarregar ou fechar esta página: o acompanhamento é retomado sem criar outra compra.
            </DialogDescription>
            {checkout.orderId ? (
              <Button asChild variant="outline" className="mt-2">
                <Link to="/pedido/$orderId" params={{ orderId: checkout.orderId }}>
                  Acompanhar pedido
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}

        {view === 'rejected' ? (
          <div role="alert" className="flex flex-col items-center gap-4 py-4 text-center">
            <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-surface-raised text-danger">
              <CircleX className="size-7" />
            </span>
            <DialogTitle ref={titleRef} tabIndex={-1} className={titleClass}>
              Pagamento recusado
            </DialogTitle>
            <DialogDescription className="max-w-md text-sm leading-6">
              {checkout.order?.failureReason ?? 'A rede recusou a transação.'} Nada foi cobrado e seus itens continuam no carrinho.
            </DialogDescription>
            <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row">
              <Button asChild variant="outline">
                <Link to="/carrinho">Voltar ao carrinho</Link>
              </Button>
              <Button onClick={onRetryAfterRejection}>
                <RotateCw aria-hidden="true" />
                Tentar novamente
              </Button>
            </div>
          </div>
        ) : null}

        {view === 'error' ? (
          <div role="alert" className="flex flex-col items-center gap-4 py-4 text-center">
            <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-surface-raised text-danger">
              <TriangleAlert className="size-7" />
            </span>
            <DialogTitle ref={titleRef} tabIndex={-1} className={titleClass}>
              Não foi possível concluir
            </DialogTitle>
            <DialogDescription className="max-w-md text-sm leading-6">
              {getErrorMessage(checkout.error)}
              {checkout.error?.isTransient
                ? ' Ao tentar de novo reenviamos a mesma solicitação: se o pedido já tiver sido criado, ele é recuperado, sem compra duplicada.'
                : null}
            </DialogDescription>
            <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row">
              <Button variant="outline" onClick={onEdit}>
                Voltar e editar
              </Button>
              <Button onClick={() => void checkout.retry()}>
                <RotateCw aria-hidden="true" />
                Tentar novamente
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ReviewStep({
  checkout,
  quote,
  wallet,
  items,
  onEdit,
  titleRef,
}: {
  checkout: UseCheckoutResult
  quote: Quote
  wallet: Wallet | null
  items: CartItem[]
  onEdit: () => void
  titleRef: React.Ref<HTMLHeadingElement>
}) {
  const input = checkout.input
  const changed = checkout.phase === 'quote-changed'
  const submitting = checkout.phase === 'submitting'
  const revalidating = checkout.phase === 'revalidating'
  const names = new Map(items.map((item) => [item.id, item]))
  if (!input) return null
  const { collector } = input

  return (
    <div className="flex flex-col gap-6">
      <div>
        <DialogTitle ref={titleRef} tabIndex={-1} className={titleClass}>
          {changed ? 'Os valores mudaram' : 'Revise sua compra'}
        </DialogTitle>
        <DialogDescription className="mt-1.5">
          {changed
            ? 'Preço, disponibilidade ou taxa mudaram desde a revisão. Confira as diferenças e aceite os novos valores para continuar.'
            : 'Valores revalidados agora com o servidor. Confira os dados antes de confirmar.'}
        </DialogDescription>
      </div>

      {changed && checkout.previousQuote ? (
        <QuoteDiff previous={checkout.previousQuote} current={quote} names={names} />
      ) : null}

      {quote.issues.length > 0 ? (
        <ul className="flex flex-col gap-1.5 rounded-sm border border-warning/50 bg-warning/5 p-3 text-sm leading-5 text-foreground">
          {quote.issues.map((issue) => (
            <li key={`${issue.itemId}-${issue.kind}`} className="flex items-start gap-2">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}

      <section aria-labelledby="review-items">
        <h3 id="review-items" className="text-sm font-bold text-text-accent">
          Itens
        </h3>
        <ul className="mt-2 divide-y divide-border">
          {quote.lines.map((line) => {
            const item = names.get(line.itemId)
            return (
              <li key={line.itemId} className={cn('flex items-baseline justify-between gap-3 py-2 text-sm', line.quantity === 0 && 'opacity-60')}>
                <span className="min-w-0 text-foreground">
                  {item?.name ?? line.nftId}
                  <span className="text-text-secondary">
                    {' '}
                    · {item?.editionLabel} · x {line.quantity}
                  </span>
                </span>
                <span className="shrink-0 font-bold text-text-accent tabular-nums">{formatEth(line.lineTotalEth)}</span>
              </li>
            )
          })}
        </ul>
        <OrderSummary quote={quote} isLoading={false} className="mt-3" />
      </section>

      <div className="grid gap-5 sm:grid-cols-2">
        <section aria-labelledby="review-collector">
          <h3 id="review-collector" className="text-sm font-bold text-text-accent">
            Colecionador
          </h3>
          <dl className="mt-2 grid gap-1 text-sm leading-5">
            <ReviewItem label="Nome">{collector.displayName}</ReviewItem>
            <ReviewItem label="Usuário">@{collector.username}</ReviewItem>
            <ReviewItem label="Perfil">{collector.profileName}</ReviewItem>
            <ReviewItem label="E-mail">{collector.email}</ReviewItem>
            <ReviewItem label="ENS">
              {collector.ensName}
              {collector.ensSuffix}
            </ReviewItem>
            <ReviewItem label="Indicação">{collector.referralCode}</ReviewItem>
            {collector.note ? <ReviewItem label="Observação">{collector.note}</ReviewItem> : null}
          </dl>
        </section>
        <section aria-labelledby="review-wallet">
          <h3 id="review-wallet" className="text-sm font-bold text-text-accent">
            Carteira e rede
          </h3>
          <dl className="mt-2 grid gap-1 text-sm leading-5">
            <ReviewItem label="Carteira">{wallet ? wallet.nickname : '—'}</ReviewItem>
            <ReviewItem label="Tipo">{WALLET_PROVIDER_LABEL[collector.walletProvider]}</ReviewItem>
            <ReviewItem label="Rede">{NETWORK_LABEL[input.network]}</ReviewItem>
            <ReviewItem label="Recebimento">
              <span title={collector.walletAddress}>{truncateAddress(collector.walletAddress)}</span>
            </ReviewItem>
          </dl>
        </section>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onEdit} disabled={submitting || revalidating}>
          Voltar e editar
        </Button>
        {changed ? (
          <Button onClick={checkout.acceptChanges}>Aceitar novos valores</Button>
        ) : (
          <Button
            onClick={() => void checkout.confirm()}
            loading={submitting || revalidating}
            loadingLabel={submitting ? 'Enviando pedido' : 'Revalidando valores'}
            disabled={!checkout.canConfirm && !submitting && !revalidating}
          >
            {submitting ? 'Enviando pedido…' : revalidating ? 'Revalidando…' : 'Confirmar compra'}
          </Button>
        )}
      </div>
      {!changed && !checkout.canConfirm && checkout.phase === 'reviewing' ? (
        <p className="-mt-3 text-right text-xs text-text-secondary">Nenhum item disponível para compra nesta cotação.</p>
      ) : null}
    </div>
  )
}

function ReviewItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 gap-2">
      <dt className="w-24 shrink-0 text-text-secondary">{label}</dt>
      <dd className="min-w-0 break-words text-foreground">{children}</dd>
    </div>
  )
}

function QuoteDiff({ previous, current, names }: { previous: Quote; current: Quote; names: Map<string, CartItem> }) {
  const before = new Map(previous.lines.map((line) => [line.itemId, line]))
  const rows = current.lines.filter((line) => {
    const old = before.get(line.itemId)
    return !old || old.quantity !== line.quantity || compareEth(old.unitPriceEth, line.unitPriceEth) !== 0
  })
  const totalDelta = compareEth(current.totalEth, previous.totalEth)

  return (
    <div role="alert" className="rounded-sm border border-warning/60 bg-warning/5 p-3 text-sm">
      <table className="w-full border-collapse text-left">
        <caption className="mb-2 text-left font-bold text-warning">O que mudou</caption>
        <thead>
          <tr className="text-xs text-text-secondary">
            <th scope="col" className="pb-1 font-normal">Item</th>
            <th scope="col" className="pb-1 text-right font-normal">Antes</th>
            <th scope="col" className="pb-1 text-right font-normal">Agora</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((line) => {
            const old = before.get(line.itemId)
            const item = names.get(line.itemId)
            return (
              <tr key={line.itemId} className="border-t border-border">
                <th scope="row" className="py-1.5 pr-2 font-normal text-foreground">
                  {item?.name ?? line.nftId}
                </th>
                <td className="py-1.5 text-right text-text-secondary tabular-nums">
                  {old ? `${old.quantity} × ${formatEth(old.unitPriceEth)}` : '—'}
                </td>
                <td className="py-1.5 pl-2 text-right font-bold text-foreground tabular-nums">
                  {line.quantity === 0 ? 'Esgotado' : `${line.quantity} × ${formatEth(line.unitPriceEth)}`}
                </td>
              </tr>
            )
          })}
          {compareEth(previous.networkFeeEth, current.networkFeeEth) !== 0 ? (
            <tr className="border-t border-border">
              <th scope="row" className="py-1.5 font-normal text-foreground">Taxa de rede</th>
              <td className="py-1.5 text-right text-text-secondary tabular-nums">{formatEth(previous.networkFeeEth)}</td>
              <td className="py-1.5 pl-2 text-right font-bold tabular-nums">{formatEth(current.networkFeeEth)}</td>
            </tr>
          ) : null}
          {compareEth(previous.discountEth, current.discountEth) !== 0 ? (
            <tr className="border-t border-border">
              <th scope="row" className="py-1.5 font-normal text-foreground">Desconto</th>
              <td className="py-1.5 text-right text-text-secondary tabular-nums">{formatEth(previous.discountEth)}</td>
              <td className="py-1.5 pl-2 text-right font-bold tabular-nums">{formatEth(current.discountEth)}</td>
            </tr>
          ) : null}
          <tr className="border-t border-border-soft">
            <th scope="row" className="pt-2 font-bold text-foreground">Total</th>
            <td className="pt-2 text-right text-text-secondary tabular-nums">
              <s aria-hidden="true">{formatEth(previous.totalEth)}</s>
              <span className="sr-only">{formatEthForScreenReader(previous.totalEth)}</span>
            </td>
            <td className="pt-2 pl-2 text-right font-bold text-text-accent tabular-nums">
              {formatEth(current.totalEth)}
              <span className="sr-only">
                {totalDelta > 0 ? ' (aumentou)' : totalDelta < 0 ? ' (diminuiu)' : ' (sem alteração)'}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
