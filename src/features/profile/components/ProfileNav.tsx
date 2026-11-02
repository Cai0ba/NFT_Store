import { Link, useNavigate } from '@tanstack/react-router'
import {
  ChartNoAxesCombined,
  Heart,
  HardDriveDownload,
  LogOut,
  ShoppingCart,
  TriangleAlert,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { COMING_SOON, ComingSoon } from '@/components/layout/ComingSoon'
import { SpinnerIcon } from '@/components/ui/spinner'
import { useLogout } from '@/features/auth/session'
import { cn } from '@/shared/lib/cn'

type NavTarget = '/perfil' | '/perfil/carteiras' | '/perfil/favoritos'

type NavEntry =
  | { label: string; icon: LucideIcon; to: NavTarget }
  | { label: string; icon: LucideIcon; to?: undefined }

const ENTRIES: NavEntry[] = [
  { label: 'Dados do perfil', icon: UserRound, to: '/perfil' },
  { label: 'Carteiras', icon: Wallet, to: '/perfil/carteiras' },
  { label: 'Atividade', icon: ShoppingCart },
  { label: 'Lista de interesse', icon: Heart, to: '/perfil/favoritos' },
  { label: 'Ofertas', icon: ChartNoAxesCombined },
  { label: 'Arquivos baixados', icon: HardDriveDownload },
  { label: 'Suporte', icon: TriangleAlert },
]

const itemClass = cn(
  'relative flex h-11 shrink-0 items-center gap-2.5 rounded-pill border border-border px-4 text-sm leading-5 whitespace-nowrap text-text-accent',
  'lg:h-[45px] lg:w-full lg:rounded-none lg:border-0 lg:px-5',
  'hover:bg-surface-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-text-accent',
)

const activeClass = cn(
  'border-primary bg-surface-raised font-medium',
  'lg:before:absolute lg:before:inset-y-0 lg:before:left-0 lg:before:w-1.5 lg:before:bg-primary',
)

/**
 * Sidebar "Meu perfil". No desktop é a coluna do Figma; abaixo de 1024px vira uma faixa rolável
 * no topo só com os destinos disponíveis (os "Em breve" ficam no desktop).
 */
export function ProfileNav({ className }: { className?: string }) {
  const navigate = useNavigate()
  const logout = useLogout()

  const signOut = async () => {
    // Sai da rota privada antes de limpar a sessão, senão o guard levaria ao login em vez do Início.
    await navigate({ to: '/' })
    // A promessa sobrevive ao desmontar da página; callbacks do mutate() não.
    logout
      .mutateAsync()
      .then(() => toast.success('Você saiu da sua conta.'))
      .catch(() => toast.success('Você saiu da sua conta neste dispositivo.'))
  }

  return (
    <nav aria-labelledby="profile-nav-title" className={cn('min-w-0 lg:bg-surface-card lg:pt-[26px] lg:pb-3', className)}>
      <p id="profile-nav-title" className="sr-only lg:not-sr-only lg:px-2.5 lg:pb-2 lg:text-lg lg:leading-6 lg:font-bold lg:text-foreground">
        Meu perfil
      </p>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:-mx-6 md:px-6 lg:mx-0 lg:mt-1 lg:flex-col lg:gap-0 lg:overflow-visible lg:p-0 [&::-webkit-scrollbar]:hidden">
        {ENTRIES.map(({ label, icon: Icon, to }) => (
          <li key={label} className={cn(!to && 'hidden lg:block')}>
            {to ? (
              <Link
                to={to}
                activeOptions={{ exact: true }}
                className={itemClass}
                activeProps={{ className: activeClass, 'aria-current': 'page' }}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
                {label}
              </Link>
            ) : (
              <ComingSoon side="right" className={cn(itemClass, 'hover:bg-transparent')}>
                <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
                {label}
                <span aria-hidden="true" className="ml-auto rounded-pill border border-border-soft px-1.5 text-[10px] leading-4 text-text-secondary">
                  {COMING_SOON}
                </span>
              </ComingSoon>
            )}
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={logout.isPending}
            className={cn(itemClass, 'cursor-pointer font-bold')}
          >
            {logout.isPending ? <SpinnerIcon /> : <LogOut aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />}
            Sair
          </button>
        </li>
      </ul>
    </nav>
  )
}
