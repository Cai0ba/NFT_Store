import { Link, useRouterState } from '@tanstack/react-router'
import { Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSessionExpiry } from '@/features/auth/session'
import { isAuthPath, isPrivatePath, loginRedirectFor } from './route-chrome'

/**
 * Em rota pública a expiração não força nada: o visitante continua navegando, mas fica sabendo
 * que favoritos e checkout pedem um novo login. Nas privadas quem age é o guard.
 */
export function SessionExpiryBanner() {
  const { expired, reason, resumeHref, acknowledge } = useSessionExpiry()
  const location = useRouterState({ select: (s) => s.location })

  if (!expired || isAuthPath(location.pathname) || isPrivatePath(location.pathname)) return null

  return (
    <div role="status" className="container-page mt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-sm border border-warning/50 border-l-4 border-l-warning bg-surface-card px-4 py-3">
        <Clock aria-hidden="true" className="size-5 shrink-0 text-warning" />
        <p className="min-w-0 flex-1 text-sm leading-5 text-foreground">
          {reason ?? 'Sua sessão expirou.'}
        </p>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link to="/entrar" search={{ redirect: resumeHref ?? loginRedirectFor(location.href) }}>
              Entrar novamente
            </Link>
          </Button>
          <button
            type="button"
            onClick={acknowledge}
            aria-label="Dispensar aviso de sessão expirada"
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-sm text-text-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-text-accent"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
