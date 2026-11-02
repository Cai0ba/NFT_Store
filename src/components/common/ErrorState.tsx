import { RotateCw, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/shared/lib/cn'

type ErrorStateProps = {
  title?: string
  description?: ReactNode
  onRetry?: () => void
  retrying?: boolean
  retryLabel?: string
  headingLevel?: 'h2' | 'h3'
  className?: string
}

export function ErrorState({
  title = 'Não foi possível carregar',
  description = 'Verifique sua conexão e tente novamente.',
  onRetry,
  retrying = false,
  retryLabel = 'Tentar novamente',
  headingLevel: Heading = 'h2',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-danger/40 bg-surface-card px-6 py-12 text-center',
        className,
      )}
    >
      <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-surface-raised text-danger">
        <TriangleAlert className="size-6" />
      </span>
      <Heading className="text-base font-bold text-foreground">{title}</Heading>
      {description ? <p className="max-w-md text-sm leading-6 text-text-secondary">{description}</p> : null}
      {onRetry ? (
        <Button onClick={onRetry} loading={retrying} loadingLabel="Tentando novamente" className="mt-2">
          {retrying ? null : <RotateCw aria-hidden="true" />}
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}
