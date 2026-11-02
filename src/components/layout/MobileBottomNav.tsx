import { Link, useRouterState } from '@tanstack/react-router'
import { Heart, House, ScanLine, ShoppingCart, UserRound } from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { useCartCount } from '@/features/cart/hooks'
import { cn } from '@/shared/lib/cn'

/** Altura útil da barra (sem safe-area); o <main> reserva este espaço no mobile. */
export const MOBILE_NAV_HEIGHT = 'calc(5.5rem + env(safe-area-inset-bottom))'

type NavIcon = ComponentType<SVGProps<SVGSVGElement>>

const itemClass = cn(
  'relative flex size-12 items-center justify-center rounded-full transition-colors',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent',
)

function itemState(active: boolean) {
  return active ? 'text-text-accent' : 'text-foreground hover:text-text-accent'
}

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const count = useCartCount()

  const isHome = pathname === '/'
  const isFavorites = pathname.startsWith('/perfil/favoritos')
  const isCart = pathname.startsWith('/carrinho')
  const isProfile = pathname.startsWith('/perfil') && !isFavorites

  const navLink = (to: '/' | '/perfil/favoritos' | '/carrinho' | '/perfil', label: string, Icon: NavIcon, active: boolean) => (
    <Link to={to} aria-label={label} aria-current={active ? 'page' : undefined} className={cn(itemClass, itemState(active))}>
      <Icon aria-hidden="true" className={cn('size-[22px]', active && Icon !== ShoppingCart && 'fill-current')} />
    </Link>
  )

  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-40 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div aria-hidden="true" className="absolute inset-0 top-0 rounded-t-[32px] bg-surface-card shadow-[0_-6px_20px_rgb(10_6_4/0.45)]" />
      <ul className="relative mx-auto grid h-[88px] max-w-md grid-cols-5 items-center px-3">
        <li className="flex justify-center">{navLink('/', 'Início', House, isHome)}</li>
        <li className="flex justify-center">{navLink('/perfil/favoritos', 'Favoritos', Heart, isFavorites)}</li>
        <li className="flex justify-center">
          {/* O anel da cor do fundo imita o recorte da barra em volta do botão central do Figma. */}
          <button
            type="button"
            aria-label="Escanear NFT"
            onClick={() =>
              toast.info('Leitura de QR code indisponível na demonstração.', {
                description: 'Disponível na versão completa do app.',
              })
            }
            className={cn(
              '-mt-14 flex size-[66px] cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground',
              'ring-[10px] ring-ink hover:bg-text-accent',
              'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-text-accent',
            )}
          >
            <ScanLine aria-hidden="true" className="size-7" strokeWidth={1.75} />
          </button>
        </li>
        <li className="flex justify-center">
          <Link
            to="/carrinho"
            aria-label={count === 0 ? 'Carrinho vazio' : `Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
            aria-current={isCart ? 'page' : undefined}
            className={cn(itemClass, itemState(isCart))}
          >
            <ShoppingCart aria-hidden="true" className="size-[22px]" />
            {count > 0 ? (
              <Badge variant="count" aria-hidden="true" className="absolute top-1.5 right-1 min-w-4 px-0.5">
                {count > 99 ? '99+' : count}
              </Badge>
            ) : null}
          </Link>
        </li>
        <li className="flex justify-center">{navLink('/perfil', 'Perfil', UserRound, isProfile)}</li>
      </ul>
    </nav>
  )
}
