import { Link } from '@tanstack/react-router'
import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { FacebookIcon, GoogleIcon } from '@/components/common/icons'
import { cn } from '@/shared/lib/cn'

export type AuthMode = 'login' | 'register'

export const AUTH_COPY = {
  login: {
    description: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
    mobileTitle: 'Entrar',
    documentTitle: 'Entrar',
  },
  register: {
    description: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
    mobileTitle: 'Criar perfil de colecionador',
    documentTitle: 'Criar conta',
  },
} as const

const unavailable = (what: string) =>
  toast.info(`${what} indisponível na demonstração.`, { description: 'Use e-mail e senha para continuar.' })

/** Abas do modal desktop. Cada aba é uma rota (/entrar e /cadastro), então são links, não role=tab. */
export function AuthTabs({ mode, redirect }: { mode: AuthMode; redirect: string | undefined }) {
  const tabClass = (active: boolean) =>
    cn(
      'rounded-xs px-1 text-lg leading-6 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent',
      active ? 'text-text-accent' : 'text-foreground hover:text-text-accent',
    )
  return (
    <nav aria-label="Acesso à conta" className="flex items-center justify-center gap-1">
      <Link to="/entrar" search={{ redirect }} replace aria-current={mode === 'login' ? 'page' : undefined} className={tabClass(mode === 'login')}>
        Entrar
      </Link>
      <span aria-hidden="true" className="h-6 w-px bg-foreground/80" />
      <Link
        to="/cadastro"
        search={{ redirect }}
        replace
        aria-current={mode === 'register' ? 'page' : undefined}
        className={tabClass(mode === 'register')}
      >
        Criar conta
      </Link>
    </nav>
  )
}

export function SocialLogin({ variant }: { variant: 'dialog' | 'screen' }) {
  const buttonClass = cn(
    'flex w-full cursor-pointer items-center justify-center gap-3 rounded-xs border border-border-soft text-[13px] text-text-secondary transition-colors',
    'hover:border-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent',
    variant === 'dialog' ? 'h-[38px]' : 'h-[38px] text-sm',
  )
  return (
    <div className="flex flex-col gap-3.5">
      <button type="button" className={buttonClass} onClick={() => unavailable('Login com Google')}>
        <GoogleIcon />
        Continuar com Google
      </button>
      <button type="button" className={buttonClass} onClick={() => unavailable('Login com Facebook')}>
        <FacebookIcon />
        Continuar com Facebook
      </button>
    </div>
  )
}

export function AuthDivider({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <span className="text-[13px] leading-5 text-foreground">Ou continue com</span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  )
}

export function forgotPassword() {
  toast.info('Recuperação de senha indisponível na demonstração.', {
    description: 'Para testar, use ana@kurio.test ou bruno@kurio.test com a senha Kurio123.',
  })
}

export function FormAlert({ id, children, tone = 'danger' }: { id?: string; children: ReactNode; tone?: 'danger' | 'warning' }) {
  return (
    <div
      id={id}
      role="alert"
      tabIndex={-1}
      className={cn(
        'flex items-start gap-2 rounded-xs border px-3 py-2.5 text-[13px] leading-5 outline-none',
        tone === 'danger' ? 'border-danger/50 bg-danger/10 text-foreground' : 'border-warning/50 bg-warning/10 text-foreground',
      )}
    >
      <TriangleAlert aria-hidden="true" className={cn('mt-0.5 size-4 shrink-0', tone === 'danger' ? 'text-danger' : 'text-warning')} />
      <div>{children}</div>
    </div>
  )
}
