import { NftImage } from '@/components/common/NftImage'
import { Skeleton } from '@/components/ui/skeleton'
import type { CartItem, Quote } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'
import { formatEth, formatEthForScreenReader } from '@/shared/lib/money'

type CheckoutItemsProps = {
  items: CartItem[] | undefined
  quote: Quote | undefined
  isLoading: boolean
  headingId: string
  className?: string
}

/** "Seus NFTs" do pagamento: quantidade e subtotal de cada linha conforme a cotação. */
export function CheckoutItems({ items, quote, isLoading, headingId, className }: CheckoutItemsProps) {
  const lines = new Map((quote?.lines ?? []).map((line) => [line.itemId, line]))

  return (
    <section aria-labelledby={headingId} className={className}>
      <h2 id={headingId} className="text-base leading-6 font-bold text-foreground">
        Seus NFTs
      </h2>
      <div aria-hidden="true" className="mt-2 flex justify-between text-sm leading-5 font-bold text-foreground">
        <span>NFTs</span>
        <span>Subtotal</span>
      </div>
      <ul className="mt-2.5 flex flex-col gap-2.5">
        {isLoading || !items
          ? Array.from({ length: 2 }, (_, index) => (
              <li key={index} aria-hidden="true" className="flex h-[70px] items-center gap-3 bg-surface-card pr-3">
                <Skeleton className="size-[70px] rounded-md" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </li>
            ))
          : items.map((item) => {
              const line = lines.get(item.id)
              const quantity = line?.quantity ?? item.quantity
              const total = line?.lineTotalEth ?? item.lineTotalEth
              return (
                <li key={item.id} className={cn('flex min-h-[70px] items-center gap-3 bg-surface-card pr-3', quantity === 0 && 'opacity-60')}>
                  <NftImage artwork={item.artwork} alt="" sizes="70px" className="size-[70px] shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] leading-5 font-bold text-foreground">{item.name}</p>
                    <p className="truncate text-[13px] leading-5 text-text-secondary">ID do token: {item.tokenId}</p>
                  </div>
                  <span className="shrink-0 text-[13px] text-text-secondary tabular-nums">
                    <span aria-hidden="true">(x {quantity})</span>
                    <span className="sr-only">Quantidade: {quantity}</span>
                  </span>
                  <span className="w-[5.5rem] shrink-0 text-right text-base font-bold text-text-accent tabular-nums">
                    <span aria-hidden="true">{formatEth(total)}</span>
                    <span className="sr-only">Subtotal: {formatEthForScreenReader(total)}</span>
                  </span>
                </li>
              )
            })}
      </ul>
    </section>
  )
}
