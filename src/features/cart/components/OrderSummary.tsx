import { RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { SpinnerIcon } from '@/components/ui/spinner'
import type { EthAmount, Quote } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'
import { formatDiscount, formatEth, formatEthForScreenReader, isZeroEth } from '@/shared/lib/money'

type OrderSummaryProps = {
  quote: Quote | undefined
  isLoading: boolean
  /** Refetch em segundo plano (evento do socket, troca de rede, cupom): os valores atuais seguem visíveis. */
  isUpdating?: boolean
  isError?: boolean
  onRetry?: () => void
  className?: string
}

function Amount({ value, srLabel, className }: { value: EthAmount; srLabel: string; className?: string }) {
  return (
    <dd className={cn('tabular-nums', className)}>
      <span aria-hidden="true">{formatEth(value)}</span>
      <span className="sr-only">
        {srLabel}: {formatEthForScreenReader(value)}
      </span>
    </dd>
  )
}

function Row({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-6 items-baseline justify-between gap-4', className)}>
      <dt>{label}</dt>
      {children}
    </div>
  )
}

const valueSkeleton = <Skeleton className="h-4 w-20 self-center" />

/**
 * Resumo de valores da cotação. Todos os números vêm da API (`/api/cart/quote`); a UI só formata.
 * Mantém a mesma geometria no carregamento para o botão logo abaixo não pular.
 */
export function OrderSummary({ quote, isLoading, isUpdating = false, isError = false, onRetry, className }: OrderSummaryProps) {
  const showSkeleton = isLoading || (!quote && !isError)

  return (
    <div className={cn('relative', className)}>
      {isUpdating && quote ? (
        <span className="absolute -top-6 right-0 inline-flex items-center gap-1.5 text-xs text-text-secondary">
          <SpinnerIcon className="size-3" />
          Atualizando valores
        </span>
      ) : null}

      {isError && !quote ? (
        <div role="alert" className="flex flex-col items-start gap-2 rounded-sm border border-danger/40 p-3 text-sm text-text-secondary">
          Não foi possível calcular os valores agora.
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xs font-bold text-text-accent hover:underline"
            >
              <RotateCw aria-hidden="true" className="size-3.5" />
              Tentar novamente
            </button>
          ) : null}
        </div>
      ) : (
        <dl aria-busy={showSkeleton || isUpdating || undefined} className="flex flex-col gap-2.5 text-[15px] leading-6 text-foreground">
          <Row label="Subtotal">
            {showSkeleton || !quote ? valueSkeleton : <Amount value={quote.subtotalEth} srLabel="Subtotal" />}
          </Row>
          <Row label="Desconto do lançamento">
            {showSkeleton || !quote ? (
              valueSkeleton
            ) : (
              <dd className="tabular-nums">
                <span aria-hidden="true">{formatDiscount(quote.discountEth)}</span>
                <span className="sr-only">
                  {isZeroEth(quote.discountEth)
                    ? 'Sem desconto'
                    : `Desconto${quote.coupon ? ` do cupom ${quote.coupon.code}` : ''}: ${formatEthForScreenReader(quote.discountEth)}`}
                </span>
              </dd>
            )}
          </Row>
          <div>
            <Row label="Taxa de rede">
              {showSkeleton || !quote ? valueSkeleton : <Amount value={quote.networkFeeEth} srLabel="Taxa de rede estimada" />}
            </Row>
            <p aria-hidden="true" className="mt-0.5 text-right text-xs leading-4 text-text-accent">
              Taxa estimada
            </p>
          </div>
          <Row
            label={<span className="text-base font-bold">Total</span>}
            className="mt-2 border-t border-border pt-3"
          >
            {showSkeleton || !quote ? (
              <Skeleton className="h-5 w-28 self-center" />
            ) : (
              <Amount value={quote.totalEth} srLabel="Total" className="text-lg font-bold text-text-accent" />
            )}
          </Row>
        </dl>
      )}
    </div>
  )
}
