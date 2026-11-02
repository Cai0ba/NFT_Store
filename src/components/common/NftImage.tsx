import type { ComponentProps } from 'react'
import type { ArtworkKey } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'

export const ART_WIDTHS = [400, 800] as const

export const artworkSrc = (artwork: ArtworkKey, width: (typeof ART_WIDTHS)[number] = 400) =>
  `/art/${artwork}-${width}.webp`

export const artworkSrcSet = (artwork: ArtworkKey) =>
  ART_WIDTHS.map((w) => `${artworkSrc(artwork, w)} ${w}w`).join(', ')

export type NftImageProps = Omit<ComponentProps<'img'>, 'src' | 'srcSet' | 'alt' | 'loading'> & {
  artwork: ArtworkKey
  alt: string
  /** Imagens acima da dobra (LCP): carrega já, com prioridade alta. */
  priority?: boolean
}

/**
 * As artes são quadradas; width/height intrínsecos + aspect-square garantem a reserva de espaço antes do download.
 * `sizes` padrão cobre o card do grid (258px no desktop, meia tela no mobile).
 */
export function NftImage({
  artwork,
  alt,
  priority = false,
  sizes = '(min-width: 768px) 258px, 50vw',
  width = 400,
  height = 400,
  className,
  ...props
}: NftImageProps) {
  return (
    <img
      src={artworkSrc(artwork)}
      srcSet={artworkSrcSet(artwork)}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      draggable={false}
      className={cn('aspect-square h-auto w-full rounded-lg bg-surface-raised object-cover', className)}
      {...props}
    />
  )
}
