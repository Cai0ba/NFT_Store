import { cva, type VariantProps } from 'class-variance-authority'
import type { EthAmount } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'
import { compareEth, formatEth, formatEthForScreenReader } from '@/shared/lib/money'

const priceVariants = cva('inline-flex flex-wrap items-baseline gap-x-2 font-mono tabular-nums', {
  variants: {
    size: {
      sm: 'text-sm leading-5',
      md: 'text-base leading-5',
      lg: 'text-price leading-5',
      xl: 'text-2xl leading-8 md:text-[28px]',
    },
    tone: {
      accent: '[&>[data-current]]:text-text-accent',
      foreground: '[&>[data-current]]:text-foreground',
    },
  },
  defaultVariants: { size: 'lg', tone: 'accent' },
})

export type PriceProps = VariantProps<typeof priceVariants> & {
  value: EthAmount
  /** Exibido riscado apenas quando for maior que o preço atual. */
  previousValue?: EthAmount | null
  /** Prefixo lido pelo leitor de tela, ex.: "Preço" ou "Total". */
  srLabel?: string
  weight?: 'bold' | 'regular'
  className?: string
  as?: 'span' | 'p' | 'div' | 'dd'
}

export function Price({
  value,
  previousValue,
  size,
  tone,
  srLabel = 'Preço',
  weight = 'bold',
  className,
  as: Component = 'span',
}: PriceProps) {
  const showPrevious = previousValue != null && compareEth(previousValue, value) > 0
  const spoken = [
    `${srLabel}: ${formatEthForScreenReader(value)}`,
    showPrevious ? `antes ${formatEthForScreenReader(previousValue)}` : null,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <Component className={cn(priceVariants({ size, tone }), className)}>
      <span data-current aria-hidden="true" className={weight === 'bold' ? 'font-bold' : 'font-normal'}>
        {formatEth(value)}
      </span>
      {showPrevious ? (
        <s aria-hidden="true" className="font-normal text-text-secondary decoration-text-secondary">
          {formatEth(previousValue)}
        </s>
      ) : null}
      <span className="sr-only">{spoken}</span>
    </Component>
  )
}
