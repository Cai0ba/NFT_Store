import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

type SectionHeadingProps = {
  children: ReactNode
  as?: 'h1' | 'h2' | 'h3'
  /** `accent`: "Mais desta coleção"; `foreground`: "Resumo da carteira", "Perfil do colecionador". */
  tone?: 'accent' | 'foreground'
  divider?: boolean
  action?: ReactNode
  id?: string
  className?: string
}

export function SectionHeading({
  children,
  as: Heading = 'h2',
  tone = 'accent',
  divider = true,
  action,
  id,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex items-end justify-between gap-4',
        divider && 'border-b border-border pb-2',
        className,
      )}
    >
      <Heading
        id={id}
        className={cn(
          'text-[15px] leading-6 font-bold md:text-base',
          tone === 'accent' ? 'text-text-accent' : 'text-foreground',
        )}
      >
        {children}
      </Heading>
      {action ? <div className="shrink-0 text-sm">{action}</div> : null}
    </div>
  )
}
