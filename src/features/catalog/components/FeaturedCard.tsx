import { Link } from '@tanstack/react-router'
import { NftImage } from '@/components/common/NftImage'
import { Price } from '@/components/common/Price'
import { Skeleton } from '@/components/ui/skeleton'
import type { NftSummary } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'

export function FeaturedCard({
  nft,
  loading,
  layout = 'vertical',
  className,
}: {
  nft: NftSummary | null | undefined
  loading: boolean
  layout?: 'vertical' | 'horizontal'
  className?: string
}) {
  if (!nft && !loading) return null
  const horizontal = layout === 'horizontal'

  return (
    <section
      aria-labelledby="destaque-titulo"
      className={cn('group relative bg-surface-card', horizontal && 'flex items-stretch gap-5 p-4', className)}
    >
      <div className={cn(horizontal ? 'flex min-w-0 flex-1 flex-col justify-center' : 'px-4 pt-5 pb-4 text-center')}>
        <h2 id="destaque-titulo" className={cn('text-xl leading-7 font-bold text-text-accent uppercase', !horizontal && 'text-left')}>
          NFT em destaque
        </h2>
        <p className={cn('text-base leading-6 font-bold text-foreground uppercase', !horizontal && 'mt-1')}>Oferta limitada</p>
        {horizontal && nft ? (
          <div className="mt-3">
            <FeaturedLink nft={nft} />
            <Price value={nft.priceEth} previousValue={nft.previousPriceEth} as="p" className="mt-1" />
          </div>
        ) : null}
      </div>
      <div className={cn(horizontal ? 'w-32 shrink-0 sm:w-40' : '')}>
        {nft ? (
          <NftImage
            artwork={nft.artwork}
            alt={nft.imageAlt}
            sizes={horizontal ? '160px' : '310px'}
            className={cn('object-cover transition-transform', horizontal ? 'aspect-square' : 'aspect-[310/365] rounded-lg')}
          />
        ) : (
          <Skeleton className={cn('w-full rounded-lg', horizontal ? 'aspect-square' : 'aspect-[310/365]')} />
        )}
      </div>
      {!horizontal && nft ? (
        <div className="px-4 pt-3 pb-4">
          <FeaturedLink nft={nft} />
          <Price value={nft.priceEth} previousValue={nft.previousPriceEth} as="p" className="mt-1" />
        </div>
      ) : null}
    </section>
  )
}

function FeaturedLink({ nft }: { nft: NftSummary }) {
  return (
    <Link
      to="/nft/$nftId"
      params={{ nftId: nft.id }}
      className={cn(
        'block truncate text-body-lg leading-5 text-foreground outline-none hover:text-text-accent',
        "after:absolute after:inset-0 after:content-['']",
        'focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-text-accent',
      )}
    >
      {nft.name}
    </Link>
  )
}
