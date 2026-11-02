import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

type EmptyStateProps = {
  title: string
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  headingLevel?: 'h2' | 'h3'
  className?: string
}

export function EmptyState({ title, description, icon, action, headingLevel: Heading = 'h2', className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-soft bg-surface-card/60 px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? (
        <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-surface-raised text-text-accent [&_svg]:size-6">
          {icon}
        </span>
      ) : null}
      <Heading className="text-base font-bold text-foreground">{title}</Heading>
      {description ? <p className="max-w-md text-sm leading-6 text-text-secondary">{description}</p> : null}
      {action ? <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  )
}
