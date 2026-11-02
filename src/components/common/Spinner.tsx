import { SpinnerIcon } from '@/components/ui/spinner'
import { cn } from '@/shared/lib/cn'

type SpinnerProps = {
  /** Texto anunciado ao leitor de tela e, com `showLabel`, exibido ao lado. */
  label?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClass = { sm: 'size-4', md: 'size-6', lg: 'size-10' } as const

export function Spinner({ label = 'Carregando', showLabel = false, size = 'md', className }: SpinnerProps) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-text-accent', className)}>
      <SpinnerIcon className={sizeClass[size]} />
      <span className={showLabel ? 'text-sm text-text-secondary' : 'sr-only'}>{label}</span>
    </span>
  )
}
