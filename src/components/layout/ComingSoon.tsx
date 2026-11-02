import type { ReactNode } from 'react'
import { SimpleTooltip } from '@/components/ui/tooltip'
import { cn } from '@/shared/lib/cn'

export const COMING_SOON = 'Em breve'

/**
 * Item fora do escopo da demonstração: continua focável (o tooltip aparece no foco também), mas
 * anuncia que está indisponível e não faz nada ao clicar.
 */
export function ComingSoon({
  children,
  className,
  side,
}: {
  children: ReactNode
  className?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
}) {
  return (
    <SimpleTooltip content={COMING_SOON} side={side}>
      <button
        type="button"
        aria-disabled="true"
        onClick={(event) => event.preventDefault()}
        className={cn('cursor-not-allowed text-left opacity-60', className)}
      >
        {children}
        <span className="sr-only"> ({COMING_SOON.toLowerCase()})</span>
      </button>
    </SimpleTooltip>
  )
}
