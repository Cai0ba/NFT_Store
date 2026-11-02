import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

export const badgeVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-1 font-mono font-bold whitespace-nowrap uppercase',
  {
    variants: {
      variant: {
        // Etiqueta "RARO" do card: retângulo reto encostado na borda do bloco.
        rare: 'h-[29px] min-w-[79px] bg-primary px-3 text-sm text-primary-foreground',
        'sold-out': 'h-[29px] min-w-[79px] border border-foreground bg-ink/90 px-3 text-xs tracking-wide text-foreground',
        neutral: 'h-6 rounded-xs bg-surface-raised px-2 text-xs text-text-secondary normal-case',
        outline: 'h-6 rounded-pill border border-border-soft px-2.5 text-xs font-medium text-text-secondary normal-case',
        count:
          'size-4 min-w-4 rounded-full bg-primary px-1 text-[10px] leading-none text-primary-foreground tabular-nums',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}
