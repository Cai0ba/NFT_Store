import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import type { Edition } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'

export type EditionChipsProps = {
  editions: readonly Pick<Edition, 'id' | 'label' | 'available'>[]
  value: string
  onValueChange: (editionId: string) => void
  /** id do elemento visível que rotula o grupo ("Edição:"). */
  labelledBy?: string
  label?: string
  size?: 'sm' | 'lg'
  className?: string
}

/**
 * Radiogroup do Radix: setas navegam entre as edições e só a selecionada entra no Tab.
 * Edições esgotadas ficam riscadas e desabilitadas, com "esgotada" para leitores de tela.
 */
export function EditionChips({
  editions,
  value,
  onValueChange,
  labelledBy,
  label = 'Edição',
  size = 'sm',
  className,
}: EditionChipsProps) {
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      orientation="horizontal"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      className={cn('flex flex-wrap', size === 'sm' ? 'gap-1.5' : 'gap-3', className)}
    >
      {editions.map((edition) => {
        const soldOut = edition.available === 0
        return (
          <RadioGroupPrimitive.Item
            key={edition.id}
            value={edition.id}
            disabled={soldOut}
            className={cn(
              'inline-flex cursor-pointer items-center justify-center rounded-pill border border-border-soft font-mono text-text-secondary uppercase',
              'transition-colors hover:border-secondary hover:text-foreground',
              'data-[state=checked]:border-text-accent data-[state=checked]:font-bold data-[state=checked]:text-text-accent',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent',
              'disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-border-soft disabled:hover:text-text-secondary',
              size === 'sm' ? 'h-7 min-w-9 px-2 text-[13px]' : 'h-9 min-w-12 px-3.5 text-base',
            )}
          >
            <span className={cn(soldOut && 'line-through decoration-1')}>{edition.label}</span>
            {soldOut ? <span className="sr-only">, esgotada</span> : null}
          </RadioGroupPrimitive.Item>
        )
      })}
    </RadioGroupPrimitive.Root>
  )
}
