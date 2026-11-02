import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

export const iconButtonVariants = cva(
  [
    'relative inline-flex shrink-0 cursor-pointer items-center justify-center transition-colors duration-150',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent',
    'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-60',
    "[&_svg:not([class*='size-'])]:size-[18px] [&_svg]:pointer-events-none",
  ],
  {
    variants: {
      tone: {
        // Botões escuros sobre a arte (hover do card, favoritar no mobile).
        overlay: 'border border-border bg-ink/85 text-foreground hover:bg-ink hover:text-text-accent',
        raised: 'border border-border bg-surface-raised/70 text-text-accent hover:bg-surface-raised',
        ghost: 'text-foreground hover:bg-surface-raised hover:text-text-accent',
      },
      shape: { square: 'rounded-sm', circle: 'rounded-full' },
      size: { sm: 'size-8', md: 'size-[34px]', lg: 'size-11' },
    },
    defaultVariants: { tone: 'ghost', shape: 'square', size: 'md' },
  },
)

export type IconButtonProps = Omit<ComponentProps<'button'>, 'aria-label'> &
  VariantProps<typeof iconButtonVariants> & {
    /** Nome acessível obrigatório: o botão só tem ícone. */
    label: string
  }

export function IconButton({ label, tone, shape, size, className, type = 'button', children, ...props }: IconButtonProps) {
  return (
    <button type={type} aria-label={label} className={cn(iconButtonVariants({ tone, shape, size }), className)} {...props}>
      {children}
    </button>
  )
}
