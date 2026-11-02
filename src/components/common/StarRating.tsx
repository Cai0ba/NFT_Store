import { Star } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

const formatAverage = (value: number) => value.toFixed(1)
const spokenAverage = (value: number) => formatAverage(value).replace('.', ',')

export function ratingCountLabel(count: number) {
  if (count === 0) return 'Sem avaliações'
  return count === 1 ? '1 avaliação de colecionador' : `${count} avaliações de colecionadores`
}

function Stars({ average, className }: { average: number; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('inline-flex gap-0.5', className)}>
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.min(Math.max(average - index, 0), 1)
        return (
          <span key={index} className="relative inline-flex size-3.5">
            <Star className="absolute inset-0 size-3.5 fill-border-soft text-border-soft" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="size-3.5 fill-text-accent text-text-accent" strokeWidth={0} />
            </span>
          </span>
        )
      })}
    </span>
  )
}

type StarRatingProps = {
  average: number
  count: number
  /** `compact` é o selo do mobile: "★ 4.8(19)". */
  variant?: 'full' | 'compact'
  className?: string
}

export function StarRating({ average, count, variant = 'full', className }: StarRatingProps) {
  const spoken = `Nota ${spokenAverage(average)} de 5, ${ratingCountLabel(count).toLowerCase()}`

  if (variant === 'compact') {
    return (
      <p
        className={cn(
          'inline-flex h-7 items-center gap-1 rounded-pill border border-text-accent px-2.5 font-mono text-sm text-foreground tabular-nums',
          className,
        )}
      >
        <Star aria-hidden="true" className="size-3.5 fill-text-accent text-text-accent" strokeWidth={0} />
        <span aria-hidden="true">
          {formatAverage(average)}({count})
        </span>
        <span className="sr-only">{spoken}</span>
      </p>
    )
  }

  return (
    <p className={cn('inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-sm text-foreground', className)}>
      <Stars average={average} />
      <span aria-hidden="true">{ratingCountLabel(count)}</span>
      <span className="sr-only">{spoken}</span>
    </p>
  )
}
