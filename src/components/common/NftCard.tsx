import { Heart, Search, ShoppingCart } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { SpinnerIcon } from '@/components/ui/spinner'
import type { NftSummary } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'
import { IconButton } from './IconButton'
import { NftImage } from './NftImage'
import { Price } from './Price'

export type NftCardVariant = 'desktop-grid' | 'mobile-grid' | 'compact'

export type NftCardLinkProps = {
  className: string
  children: ReactNode
}

export type NftCardProps = {
  nft: NftSummary
  variant?: NftCardVariant
  /** Usado quando `renderLink` não é informado (gera um <a> simples). */
  href?: string
  /** Permite usar o Link do router: `renderLink={(p) => <Link to="/nft/$nftId" params={...} {...p} />}`. */
  renderLink?: (props: NftCardLinkProps) => ReactNode
  isFavorite?: boolean
  onToggleFavorite?: (next: boolean) => void
  favoritePending?: boolean
  /** Quando presente, o botão de favoritar fica indisponível e o motivo é exposto a leitores de tela. */
  favoriteDisabledReason?: string
  onAddToCart?: () => void
  addToCartPending?: boolean
  priority?: boolean
  headingLevel?: 'h2' | 'h3' | 'h4'
  className?: string
}

const layout = {
  'desktop-grid': {
    block: 'aspect-[258/300] items-center',
    media: 'w-[96.9%]',
    name: 'mt-3 text-body-lg leading-5',
    price: 'lg',
    sizes: '(min-width: 1280px) 258px, (min-width: 768px) 30vw, 50vw',
  },
  'mobile-grid': {
    block: 'aspect-[174/200] items-start pt-[6%]',
    media: 'w-[96%]',
    name: 'mt-3 text-body-lg leading-5',
    price: 'lg',
    sizes: '(min-width: 768px) 30vw, 50vw',
  },
  compact: {
    block: 'aspect-[258/300] items-center',
    media: 'w-[94%]',
    name: 'mt-2.5 text-sm leading-5',
    price: 'sm',
    sizes: '(min-width: 1280px) 240px, (min-width: 768px) 22vw, 45vw',
  },
} as const

export function NftCard({
  nft,
  variant = 'desktop-grid',
  href,
  renderLink,
  isFavorite = false,
  onToggleFavorite,
  favoritePending = false,
  favoriteDisabledReason,
  onAddToCart,
  addToCartPending = false,
  priority = false,
  headingLevel: Heading = 'h3',
  className,
}: NftCardProps) {
  const ids = useId()
  const reasonId = `${ids}-fav-reason`
  const config = layout[variant]
  const isMobile = variant === 'mobile-grid'

  // O link "esticado" cobre o card inteiro: um único tabstop para navegar, e as ações ficam por cima (z-10).
  const linkProps: NftCardLinkProps = {
    className: cn(
      'block truncate text-foreground outline-none',
      "after:absolute after:inset-0 after:z-[1] after:rounded-sm after:content-['']",
      'focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-text-accent',
    ),
    children: nft.name,
  }

  const favoriteUnavailable = Boolean(favoriteDisabledReason)
  const favoriteLabel = isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`
  const handleFavorite = () => {
    if (favoriteUnavailable || favoritePending) return
    onToggleFavorite?.(!isFavorite)
  }

  const favoriteButton = onToggleFavorite ? (
    <IconButton
      label={favoriteLabel}
      tone="overlay"
      shape={isMobile ? 'circle' : 'square'}
      size={isMobile ? 'sm' : 'md'}
      aria-pressed={isFavorite}
      aria-disabled={favoriteUnavailable || favoritePending || undefined}
      aria-busy={favoritePending || undefined}
      aria-describedby={favoriteUnavailable ? reasonId : undefined}
      title={favoriteDisabledReason}
      onClick={handleFavorite}
      className={cn(isMobile && 'text-text-accent')}
    >
      <Heart
        aria-hidden="true"
        className={cn(isMobile && 'size-4', isFavorite && 'fill-text-accent text-text-accent')}
      />
    </IconButton>
  ) : null

  return (
    <article
      aria-labelledby={`${ids}-name`}
      className={cn('group/card relative flex min-w-0 flex-col', className)}
      data-sold-out={nft.soldOut || undefined}
    >
      <div className={cn('relative flex justify-center bg-surface-card', config.block)}>
        <div className={cn('relative', config.media)}>
          <NftImage
            artwork={nft.artwork}
            alt={nft.imageAlt}
            priority={priority}
            sizes={config.sizes}
            className={cn(nft.soldOut && 'opacity-55 grayscale-[35%]')}
          />

          {isMobile && favoriteButton ? <div className="absolute top-2 right-2 z-10">{favoriteButton}</div> : null}
        </div>

        {nft.rarity === 'raro' || nft.soldOut ? (
          <div className="pointer-events-none absolute top-2.5 left-0 z-[2] flex flex-col items-start gap-1">
            {nft.rarity === 'raro' ? <Badge variant="rare">Raro</Badge> : null}
            {nft.soldOut ? <Badge variant="sold-out">Esgotado</Badge> : null}
          </div>
        ) : null}

        {!isMobile && (favoriteButton || onAddToCart) ? (
          <div
            className={cn(
              'absolute inset-x-0 bottom-1.5 z-10 flex justify-center gap-2.5',
              'opacity-0 transition-opacity duration-150 group-focus-within/card:opacity-100 group-hover/card:opacity-100',
              // Sem hover (touch), as ações ficam sempre visíveis.
              '[@media(hover:none)]:opacity-100',
            )}
          >
            {onAddToCart ? (
              <IconButton
                label={nft.soldOut ? `${nft.name} esgotado` : `Adicionar ${nft.name} ao carrinho`}
                tone="overlay"
                aria-disabled={nft.soldOut || addToCartPending || undefined}
                aria-busy={addToCartPending || undefined}
                onClick={nft.soldOut || addToCartPending ? undefined : onAddToCart}
              >
                {addToCartPending ? <SpinnerIcon /> : <ShoppingCart aria-hidden="true" />}
              </IconButton>
            ) : null}
            {favoriteButton}
            {/* A lupa repete o destino do link principal; fica só visual para não criar tabstop duplicado. */}
            <span
              aria-hidden="true"
              className="pointer-events-none inline-flex size-[34px] items-center justify-center rounded-sm border border-border bg-ink/85 text-foreground"
            >
              <Search className="size-[18px]" />
            </span>
          </div>
        ) : null}
      </div>

      <Heading id={`${ids}-name`} className={cn('min-w-0 font-normal', config.name)}>
        {renderLink ? renderLink(linkProps) : <a href={href} {...linkProps} />}
      </Heading>
      <Price
        as="p"
        value={nft.priceEth}
        previousValue={nft.previousPriceEth}
        size={config.price}
        className="mt-1.5"
      />
      {favoriteUnavailable ? (
        <span id={reasonId} className="sr-only">
          {favoriteDisabledReason}
        </span>
      ) : null}
    </article>
  )
}
