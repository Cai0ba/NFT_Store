import { Link, useCanGoBack, useRouter, type LinkProps } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { iconButtonVariants } from '@/components/common/IconButton'
import { cn } from '@/shared/lib/cn'

export interface MobileScreenHeaderProps {
  title: string
  /** Destino do voltar. Sem ele, volta no histórico (ou para o Início em acesso direto). */
  backTo?: LinkProps['to']
  className?: string
}

const backButtonClass = cn(iconButtonVariants({ tone: 'raised', shape: 'circle', size: 'lg' }), 'text-foreground')

export function MobileScreenHeader({ title, backTo, className }: MobileScreenHeaderProps) {
  const router = useRouter()
  const canGoBack = useCanGoBack()

  return (
    <header className={cn('relative flex min-h-11 items-center justify-center px-14 pt-2 md:hidden', className)}>
      {backTo || !canGoBack ? (
        <Link to={backTo ?? '/'} aria-label="Voltar" className={cn(backButtonClass, 'absolute left-0')}>
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
      ) : (
        <button type="button" aria-label="Voltar" onClick={() => router.history.back()} className={cn(backButtonClass, 'absolute left-0')}>
          <ChevronLeft className="size-5" aria-hidden />
        </button>
      )}
      <h1 className="text-center text-lg leading-6 font-bold text-foreground">{title}</h1>
    </header>
  )
}
