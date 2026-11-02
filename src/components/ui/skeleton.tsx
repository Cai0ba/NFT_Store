import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

/** Bloco de carregamento; a utility `skeleton` já desliga o shimmer com prefers-reduced-motion. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div aria-hidden="true" data-slot="skeleton" className={cn('skeleton', className)} {...props} />
}
