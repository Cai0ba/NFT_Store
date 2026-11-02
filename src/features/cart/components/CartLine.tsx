import { Link } from '@tanstack/react-router'
import { CircleAlert, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { useId } from 'react'
import { toast } from 'sonner'
import { NftImage } from '@/components/common/NftImage'
import { QuantityStepper } from '@/components/common/QuantityStepper'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SpinnerIcon } from '@/components/ui/spinner'
import { getErrorMessage, hasErrorCode } from '@/api/errors'
import { useUpdateCartItem } from '@/features/cart/hooks'
import type { CartItem, Quote, QuoteIssue } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'
import { compareEth, formatEth, formatEthForScreenReader } from '@/shared/lib/money'

type QuoteLine = Quote['lines'][number]

/** Colunas da tabela desktop (NFTs | Preço | Edições | Total | remover), medidas sobre o frame de 1440. */
export const CART_GRID_COLUMNS = 'md:grid-cols-[minmax(0,1fr)_8.75rem_8.5rem_minmax(0,9rem)_2.75rem]'

type CartLineProps = {
  item: CartItem
  quoteLine?: QuoteLine
  issues: QuoteIssue[]
  /** Linha com aviso de tempo real ainda não tratado. */
  highlighted?: boolean
  removing?: boolean
  onRemove: (item: CartItem) => void
}

function availabilityOf(details: unknown): number | null {
  if (typeof details !== 'object' || details === null) return null
  const available = Reflect.get(details, 'available')
  return typeof available === 'number' ? available : null
}

export function CartLine({ item, quoteLine, issues, highlighted = false, removing = false, onRemove }: CartLineProps) {
  const ids = useId()
  const update = useUpdateCartItem()
  const pendingQuantity = update.isPending ? update.variables?.quantity : undefined
  const quantity = pendingQuantity ?? item.quantity
  const soldOut = item.available === 0
  const priceDelta = compareEth(item.unitPriceEth, item.addedUnitPriceEth)
  const lineTotal = quoteLine?.lineTotalEth ?? item.lineTotalEth
  const chargedQuantity = quoteLine?.quantity ?? item.quantity

  const conflictAvailable = hasErrorCode(update.error, 'AVAILABILITY_CONFLICT') ? availabilityOf(update.error.details) : null
  const updateError = update.isError
    ? conflictAvailable !== null
      ? `${getErrorMessage(update.error)} Máximo disponível: ${conflictAvailable}.`
      : getErrorMessage(update.error)
    : null

  const changeQuantity = (next: number) => {
    update.mutate(
      { itemId: item.id, quantity: next, label: item.name },
      {
        onError: (error) => {
          if (!hasErrorCode(error, 'AVAILABILITY_CONFLICT')) toast.error(getErrorMessage(error))
        },
      },
    )
  }

  const messages = issues.map((issue) => issue.message)
  if (updateError) messages.push(updateError)
  const messagesId = messages.length > 0 ? `${ids}-messages` : undefined

  const priceTrend =
    priceDelta !== 0 ? (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
        {priceDelta > 0 ? <TrendingUp aria-hidden="true" className="size-3.5" /> : <TrendingDown aria-hidden="true" className="size-3.5" />}
        {priceDelta > 0 ? 'Subiu' : 'Caiu'}
        <s className="text-text-secondary">{formatEth(item.addedUnitPriceEth)}</s>
      </span>
    ) : null

  return (
    <li
      aria-labelledby={`${ids}-name`}
      aria-describedby={messagesId}
      data-highlighted={highlighted || undefined}
      className={cn(
        'relative rounded-xl bg-surface-card transition-shadow md:rounded-none',
        highlighted && 'ring-2 ring-warning/80',
        removing && 'opacity-60',
      )}
    >
      <div className={cn('grid grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-x-3 md:min-h-[70px] md:gap-x-0', CART_GRID_COLUMNS)}>
        <div className="self-start md:flex md:min-w-0 md:items-center md:gap-4 md:self-auto">
          <NftImage
            artwork={item.artwork}
            alt=""
            sizes="96px"
            className={cn(
              'size-24 rounded-l-xl rounded-r-lg md:size-[70px] md:rounded-md',
              soldOut && 'opacity-55 grayscale-[35%]',
            )}
          />
          <div className="hidden min-w-0 md:block">
            <LineName item={item} id={`${ids}-name-desktop`} />
            <p className="mt-1 truncate text-sm leading-5 text-text-secondary">ID do token: {item.tokenId}</p>
          </div>
        </div>

        {/* Mobile: nome, edição e total no meio; stepper à direita. */}
        <div className="min-w-0 py-3 md:hidden">
          <LineName item={item} id={`${ids}-name`} />
          <p className="mt-1 text-sm leading-5 text-text-secondary">Edição: {item.editionLabel}</p>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-lg leading-6 font-bold text-text-accent tabular-nums">
            <span aria-hidden="true">{formatEth(lineTotal)}</span>
            <span className="sr-only">Total do item: {formatEthForScreenReader(lineTotal)}</span>
            {priceTrend}
          </p>
        </div>

        <div className="hidden md:flex md:flex-col md:items-start md:gap-0.5">
          <span className="text-base leading-5 font-bold text-text-accent tabular-nums">
            <span aria-hidden="true">{formatEth(item.unitPriceEth)}</span>
            <span className="sr-only">Preço unitário: {formatEthForScreenReader(item.unitPriceEth)}</span>
          </span>
          {priceTrend}
        </div>

        <div className="flex flex-col items-end justify-between gap-2 self-stretch py-2.5 pr-3 md:flex-row md:items-center md:justify-start md:self-auto md:p-0">
          <button
            type="button"
            onClick={() => onRemove(item)}
            disabled={removing}
            aria-label={`Remover ${item.name} do carrinho`}
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-sm text-text-secondary hover:bg-surface-raised hover:text-text-accent focus-visible:outline-2 focus-visible:outline-text-accent disabled:cursor-wait md:hidden"
          >
            {removing ? <SpinnerIcon /> : <Trash2 aria-hidden="true" className="size-4" />}
          </button>
          {soldOut ? (
            <Badge variant="sold-out" className="h-7 min-w-0 px-2">Esgotado</Badge>
          ) : (
            <div className="flex items-center gap-2">
              <QuantityStepper
                value={quantity}
                onValueChange={changeQuantity}
                itemName={item.name}
                max={Math.max(item.available, 1)}
                tone="primary"
                size="sm"
                className="hidden md:inline-flex"
              />
              <QuantityStepper
                value={quantity}
                onValueChange={changeQuantity}
                itemName={item.name}
                max={Math.max(item.available, 1)}
                tone="raised"
                size="sm"
                className="md:hidden"
              />
              {update.isPending ? <SpinnerIcon className="size-3.5 text-text-secondary" /> : null}
            </div>
          )}
        </div>

        <div className="hidden md:block">
          <span className="text-base leading-5 font-bold text-text-accent tabular-nums">
            <span aria-hidden="true">{formatEth(lineTotal)}</span>
            <span className="sr-only">Total do item: {formatEthForScreenReader(lineTotal)}</span>
          </span>
          {chargedQuantity !== item.quantity ? (
            <p className="mt-0.5 text-xs text-text-secondary">
              {chargedQuantity === 0 ? 'Não será cobrado' : `Cobrando ${chargedQuantity} de ${item.quantity}`}
            </p>
          ) : null}
        </div>

        <div className="hidden md:flex md:justify-center">
          <button
            type="button"
            onClick={() => onRemove(item)}
            disabled={removing}
            aria-label={`Remover ${item.name} do carrinho`}
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-sm text-text-accent hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-text-accent disabled:cursor-wait"
          >
            {removing ? <SpinnerIcon /> : <Trash2 aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      {messages.length > 0 ? (
        <ul id={messagesId} className="flex flex-col gap-1 border-t border-border px-3 py-2 text-xs leading-5 text-warning md:pl-[86px]">
          {messages.map((message) => (
            <li key={message} className="flex items-start gap-1.5" role={message === updateError ? 'alert' : undefined}>
              <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              {message}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}

function LineName({ item, id }: { item: CartItem; id: string }) {
  return (
    <h3 id={id} className="text-[15px] leading-5 font-bold break-words text-foreground md:truncate md:text-base">
      <Link
        to="/nft/$nftId"
        params={{ nftId: item.nftId }}
        search={{ edition: item.editionId }}
        className="rounded-xs hover:text-text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent"
      >
        {item.name}
      </Link>
    </h3>
  )
}

/** Mesma geometria da linha real (desktop 70px; card mobile 96px) para não haver salto ao carregar. */
export function CartLineSkeleton() {
  return (
    <li aria-hidden="true" className="rounded-xl bg-surface-card md:rounded-none">
      <div className={cn('grid grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-x-3 md:min-h-[70px] md:gap-x-0', CART_GRID_COLUMNS)}>
        <div className="md:flex md:items-center md:gap-4">
          <Skeleton className="size-24 rounded-l-xl rounded-r-lg md:size-[70px] md:rounded-md" />
          <div className="hidden flex-col gap-2 md:flex">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3.5 w-28" />
          </div>
        </div>
        <div className="flex flex-col gap-2 py-3 md:hidden">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="hidden h-4 w-20 md:block" />
        <Skeleton className="mr-3 h-8 w-24 md:mr-0 md:h-7 md:w-20" />
        <Skeleton className="hidden h-4 w-20 md:block" />
        <span className="hidden md:block" />
      </div>
    </li>
  )
}
