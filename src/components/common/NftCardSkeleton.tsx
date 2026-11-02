import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/shared/lib/cn'
import type { NftCardVariant } from './NftCard'

const blockClass: Record<NftCardVariant, string> = {
  'desktop-grid': 'aspect-[258/300] items-center',
  'mobile-grid': 'aspect-[174/200] items-start pt-[6%]',
  compact: 'aspect-[258/300] items-center',
}
const mediaClass: Record<NftCardVariant, string> = {
  'desktop-grid': 'w-[96.9%]',
  'mobile-grid': 'w-[96%]',
  compact: 'w-[94%]',
}

/** Mesmo esqueleto geométrico do NftCard (bloco, arte, nome e preço) para não haver CLS na troca. */
export function NftCardSkeleton({
  variant = 'desktop-grid',
  className,
}: {
  variant?: NftCardVariant
  className?: string
}) {
  const compact = variant === 'compact'
  return (
    <div aria-hidden="true" className={cn('flex min-w-0 flex-col', className)}>
      <div className={cn('flex justify-center bg-surface-card', blockClass[variant])}>
        <Skeleton className={cn('aspect-square rounded-lg', mediaClass[variant])} />
      </div>
      <div className={cn('flex h-5 items-center', compact ? 'mt-2.5' : 'mt-3')}>
        <Skeleton className="h-3.5 w-3/5" />
      </div>
      <div className="mt-1.5 flex h-5 items-center">
        <Skeleton className="h-3.5 w-2/5" />
      </div>
    </div>
  )
}
