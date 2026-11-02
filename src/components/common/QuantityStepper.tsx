import { cva } from 'class-variance-authority'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

type StepperSize = 'sm' | 'md' | 'lg'
type StepperTone = 'primary' | 'raised'

const stepButton = cva(
  [
    'inline-flex shrink-0 cursor-pointer items-center justify-center transition-colors duration-150',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent',
    'aria-disabled:cursor-not-allowed',
  ],
  {
    variants: {
      // Desktop e detalhe mobile: cápsula laranja; carrinho mobile: círculo escuro.
      tone: {
        primary:
          'rounded-pill bg-primary text-primary-foreground hover:bg-text-accent aria-disabled:bg-surface-raised aria-disabled:text-border-soft',
        raised:
          'rounded-full bg-surface-raised text-foreground hover:text-text-accent aria-disabled:bg-surface-raised/60 aria-disabled:text-border-soft',
      },
      size: { sm: '', md: '', lg: '' },
    },
    compoundVariants: [
      { tone: 'primary', size: 'sm', className: 'h-7 w-6 [&_svg]:size-3.5' },
      { tone: 'primary', size: 'md', className: 'h-11 w-8 [&_svg]:size-5' },
      { tone: 'primary', size: 'lg', className: 'h-10 w-7 [&_svg]:size-4' },
      { tone: 'raised', size: 'sm', className: 'size-6 [&_svg]:size-3.5' },
      { tone: 'raised', size: 'md', className: 'size-8 [&_svg]:size-4' },
      { tone: 'raised', size: 'lg', className: 'size-9 [&_svg]:size-4' },
    ],
    defaultVariants: { tone: 'primary', size: 'sm' },
  },
)

const valueClass: Record<StepperSize, string> = {
  sm: 'min-w-7 text-base',
  md: 'min-w-10 text-lg',
  lg: 'min-w-9 text-xl',
}

export type QuantityStepperProps = {
  value: number
  onValueChange: (value: number) => void
  /** Nome do item, usado nos rótulos ("Diminuir quantidade de Emerald Ape #042"). */
  itemName: string
  min?: number
  max: number
  disabled?: boolean
  size?: StepperSize
  tone?: StepperTone
  className?: string
}

export function QuantityStepper({
  value,
  onValueChange,
  itemName,
  min = 1,
  max,
  disabled = false,
  size = 'sm',
  tone = 'primary',
  className,
}: QuantityStepperProps) {
  const canDecrease = !disabled && value > min
  const canIncrease = !disabled && value < max

  // aria-disabled em vez de disabled: ao chegar no limite o foco continua no botão em vez de cair no body.
  return (
    <div role="group" aria-label={`Quantidade de ${itemName}`} className={cn('inline-flex items-center gap-1', className)}>
      <button
        type="button"
        className={stepButton({ tone, size })}
        aria-label={`Diminuir quantidade de ${itemName}`}
        aria-disabled={!canDecrease || undefined}
        onClick={canDecrease ? () => onValueChange(value - 1) : undefined}
      >
        <Minus aria-hidden="true" strokeWidth={2.5} />
      </button>
      <output
        aria-live="polite"
        aria-atomic="true"
        className={cn('text-center font-mono tabular-nums text-foreground', valueClass[size])}
      >
        <span className="sr-only">Quantidade: </span>
        {value}
        {value >= max && !disabled ? <span className="sr-only">, máximo disponível</span> : null}
      </output>
      <button
        type="button"
        className={stepButton({ tone, size })}
        aria-label={`Aumentar quantidade de ${itemName}`}
        aria-disabled={!canIncrease || undefined}
        onClick={canIncrease ? () => onValueChange(value + 1) : undefined}
      >
        <Plus aria-hidden="true" strokeWidth={2.5} />
      </button>
    </div>
  )
}
