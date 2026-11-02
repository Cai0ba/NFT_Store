import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ChevronDown, Heart, LogIn, LogOut, Search, ShoppingCart, UserRound, Wallet, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SimpleTooltip } from '@/components/ui/tooltip'
import { useLogout, useSession } from '@/features/auth/session'
import { useCartCount } from '@/features/cart/hooks'
import { useCatalogSearchInput } from '@/features/catalog/components/use-catalog-search-input'
import type { User } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'
import { COMING_SOON } from './ComingSoon'
import { isMarketPath, isPrivatePath, loginRedirectFor } from './route-chrome'

const navItemClass = cn(
  'relative inline-flex h-full items-center px-1 text-body-lg leading-5 transition-colors',
  'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-pill after:bg-transparent',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent',
)
const activeNavClass = 'font-bold text-text-accent after:bg-text-accent'

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const href = useRouterState({ select: (s) => s.location.href })
  const [searchOpen, setSearchOpen] = useState(false)

  const homeActive = !isMarketPath(pathname) && /^\/(entrar|cadastro)?\/?$/.test(pathname)
  const marketActive = isMarketPath(pathname)

  return (
    <header className="container-page">
      <div className="relative flex h-[72px] items-center justify-between gap-6 border-b border-border">
        <Link
          to="/"
          className="shrink-0 rounded-xs text-sm font-bold tracking-[0.1em] text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-text-accent"
        >
          KURIO
          <span className="sr-only"> — página inicial</span>
        </Link>

        <nav
          aria-label="Principal"
          className={cn(
            'h-full lg:absolute lg:inset-y-0 lg:left-1/2 lg:-translate-x-1/2',
            // Com a busca aberta no tablet a nav cede o espaço central para o campo.
            searchOpen && 'max-lg:hidden',
          )}
        >
          <ul className="flex h-full items-center gap-6 lg:gap-10">
            <li className="h-full">
              <Link
                to="/"
                aria-current={homeActive ? 'page' : undefined}
                className={cn(navItemClass, homeActive ? activeNavClass : 'text-foreground hover:text-text-accent')}
                activeOptions={{ exact: true, includeSearch: false }}
              >
                Início
              </Link>
            </li>
            <li className="h-full">
              <Link
                to="/"
                hash="catalogo"
                aria-current={marketActive ? 'page' : undefined}
                className={cn(navItemClass, marketActive ? activeNavClass : 'text-foreground hover:text-text-accent')}
              >
                Mercado
              </Link>
            </li>
            {['Criadores', 'Aprenda'].map((label) => (
              <li key={label} className="h-full">
                <SimpleTooltip content={COMING_SOON}>
                  <button
                    type="button"
                    aria-disabled="true"
                    className={cn(navItemClass, 'cursor-not-allowed text-foreground/60')}
                  >
                    {label}
                    <span className="sr-only"> ({COMING_SOON.toLowerCase()})</span>
                  </button>
                </SimpleTooltip>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <HeaderSearch open={searchOpen} onOpenChange={setSearchOpen} />
          <CartLink />
          <AccountArea href={href} pathname={pathname} />
        </div>
      </div>
    </header>
  )
}

function HeaderSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { value, setValue, submit, onHome } = useCatalogSearchInput()
  const inputRef = useRef<HTMLInputElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  const wasOpen = useRef(open)

  useEffect(() => {
    if (open) inputRef.current?.focus()
    // Ao fechar, o foco volta para a lupa em vez de cair no body.
    else if (wasOpen.current) toggleRef.current?.focus()
    wasOpen.current = open
  }, [open])

  const close = () => onOpenChange(false)

  if (!open) {
    return (
      <button
        ref={toggleRef}
        type="button"
        aria-label="Buscar NFTs"
        aria-expanded={false}
        onClick={() => onOpenChange(true)}
        className="inline-flex size-9 cursor-pointer items-center justify-center rounded-sm text-foreground hover:text-text-accent focus-visible:outline-2 focus-visible:outline-text-accent"
      >
        <Search aria-hidden="true" className="size-5" />
      </button>
    )
  }

  return (
    <form
      role="search"
      aria-label="Buscar NFTs"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
        if (!onHome) onOpenChange(false)
      }}
      className="relative flex items-center"
    >
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 size-4 text-secondary" />
      <label htmlFor="header-search" className="sr-only">
        Buscar por nome, coleção ou ID do token
      </label>
      <input
        ref={inputRef}
        id="header-search"
        type="search"
        autoComplete="off"
        enterKeyHint="search"
        value={value}
        placeholder="Buscar NFTs"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            close()
          }
        }}
        className={cn(
          'h-9 w-52 rounded-sm border border-field-border bg-ink pr-9 pl-9 text-sm text-foreground lg:w-64',
          'placeholder:text-[13px] placeholder:text-secondary focus-visible:border-text-accent focus-visible:ring-1 focus-visible:ring-text-accent focus-visible:outline-none',
          '[&::-webkit-search-cancel-button]:hidden',
        )}
      />
      <button
        type="button"
        aria-label="Fechar busca"
        onClick={close}
        className="absolute right-1 inline-flex size-7 cursor-pointer items-center justify-center rounded-xs text-secondary hover:text-text-accent focus-visible:outline-2 focus-visible:outline-text-accent"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </form>
  )
}

function CartLink() {
  const count = useCartCount()
  const label = count === 0 ? 'Carrinho vazio' : `Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`
  return (
    <Link
      to="/carrinho"
      aria-label={label}
      className="relative inline-flex size-9 items-center justify-center rounded-sm text-foreground hover:text-text-accent focus-visible:outline-2 focus-visible:outline-text-accent"
    >
      <ShoppingCart aria-hidden="true" className="size-5" />
      <Badge variant="count" aria-hidden="true" className="absolute top-0.5 right-0 min-w-4 px-0.5">
        {count > 99 ? '99+' : count}
      </Badge>
    </Link>
  )
}

function AccountArea({ href, pathname }: { href: string; pathname: string }) {
  const { status, user } = useSession()

  if (status === 'loading') {
    // Reserva a largura do botão "Entrar" para o header não pular quando a sessão resolver.
    return <span aria-hidden="true" className="block h-[34px] w-[98px]" />
  }

  if (!user) {
    return (
      <Button asChild size="sm" className="h-[34px] gap-1.5 px-3">
        <Link to="/entrar" search={{ redirect: loginRedirectFor(href) }}>
          <LogIn aria-hidden="true" />
          Entrar
        </Link>
      </Button>
    )
  }

  return <UserMenu user={user} pathname={pathname} />
}

export function UserAvatar({ user, className }: { user: User; className?: string }) {
  const initials = user.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  return user.avatarUrl ? (
    <img src={user.avatarUrl} alt="" width={32} height={32} className={cn('size-8 rounded-full object-cover', className)} />
  ) : (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground',
        className,
      )}
    >
      {initials || 'K'}
    </span>
  )
}

function UserMenu({ user, pathname }: { user: User; pathname: string }) {
  const navigate = useNavigate()
  const logout = useLogout()

  const handleLogout = async () => {
    // Sai da rota privada antes de limpar a sessão; este menu desmonta junto com ela, então os
    // callbacks do mutate() nunca rodariam. A promessa do mutateAsync sobrevive ao desmontar.
    if (isPrivatePath(pathname)) await navigate({ to: '/' })
    logout
      .mutateAsync()
      .then(() => toast.success('Você saiu da sua conta.'))
      .catch(() => toast.success('Você saiu da sua conta neste dispositivo.'))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="group inline-flex h-9 max-w-52 cursor-pointer items-center gap-2 rounded-pill py-0.5 pr-2 pl-0.5 text-sm text-foreground hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-text-accent data-[state=open]:bg-surface-raised"
        aria-label={`Menu da conta de ${user.displayName}`}
      >
        <UserAvatar user={user} />
        <span className="hidden truncate lg:inline">{user.displayName}</span>
        <ChevronDown aria-hidden="true" className="size-4 text-text-accent transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel className="truncate">
          <span className="block truncate text-sm font-bold text-foreground">{user.displayName}</span>
          <span className="block truncate">@{user.username}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/perfil">
            <UserRound aria-hidden="true" />
            Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/perfil/carteiras">
            <Wallet aria-hidden="true" />
            Carteiras
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/perfil/favoritos">
            <Heart aria-hidden="true" />
            Favoritos
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleLogout()} disabled={logout.isPending}>
          <LogOut aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
