import { LoaderCircle } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

/** Ícone giratório puramente visual. Para anunciar carregamento use `Spinner` de components/common. */
export function SpinnerIcon({ className, ...props }: ComponentProps<typeof LoaderCircle>) {
  return (
    <LoaderCircle
      aria-hidden="true"
      className={cn('size-4 shrink-0 animate-spin motion-reduce:animate-none', className)}
      {...props}
    />
  )
}
