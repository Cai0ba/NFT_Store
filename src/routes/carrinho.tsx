import { createFileRoute, Link } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { MobileScreenHeader } from '@/components/layout/MobileScreenHeader'
import { pageTitle } from '@/components/layout/page-title'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/api/errors'
import { CartChangeNotices } from '@/features/cart/components/CartChangeNotices'
import { CART_GRID_COLUMNS, CartLine, CartLineSkeleton } from '@/features/cart/components/CartLine'
import { CouponForm } from '@/features/cart/components/CouponForm'
import { OrderSummary } from '@/features/cart/components/OrderSummary'
import { RelatedNfts } from '@/features/cart/components/RelatedNfts'
import { useAddToCart, useCart, useCartChangeNotices, useCartQuote, useRemoveCartItem } from '@/features/cart/hooks'
import { useCheckoutDraft } from '@/features/checkout/draft'
import type { CartItem, QuoteIssue } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'

export const Route = createFileRoute('/carrinho')({
  head: () => ({ meta: [{ title: pageTitle('Carrinho') }] }),
  component: CartPage,
})

const BREADCRUMBS = [
  { label: 'Início', href: '/' },
  { label: 'Mercado', href: '/#catalogo' },
  { label: 'Carrinho' },
]

function CartPage() {
  const cart = useCart()
  const { draft } = useCheckoutDraft()
  const network = draft?.network ?? 'ethereum'
  const quote = useCartQuote(network)
  const { notices, dismiss } = useCartChangeNotices()
  const removeItem = useRemoveCartItem()
  const addToCart = useAddToCart()
  const [removingIds, setRemovingIds] = useState<ReadonlySet<string>>(new Set())

  const items = cart.data?.items
  const cartNftIds = useMemo(() => new Set((items ?? []).map((item) => item.nftId)), [items])
  const issuesByItem = useMemo(() => {
    const map = new Map<string, QuoteIssue[]>()
    for (const issue of quote.data?.issues ?? []) map.set(issue.itemId, [...(map.get(issue.itemId) ?? []), issue])
    return map
  }, [quote.data])
  const linesByItem = useMemo(() => new Map((quote.data?.lines ?? []).map((line) => [line.itemId, line])), [quote.data])
  const noticeItemIds = useMemo(() => new Set(notices.map((notice) => notice.itemId)), [notices])

  const isLoading = cart.isPending
  const isEmpty = cart.isSuccess && cart.data.items.length === 0
  const hasPurchasable = Boolean(quote.data?.lines.some((line) => line.quantity > 0))

  // Remoção imediata com "Desfazer": mais rápido que um diálogo de confirmação e igualmente seguro.
  const handleRemove = (item: CartItem) => {
    setRemovingIds((current) => new Set(current).add(item.id))
    removeItem.mutate(
      { itemId: item.id, label: item.name },
      {
        onSuccess: () => {
          toast.success(`${item.name} removido do carrinho.`, {
            action: {
              label: 'Desfazer',
              onClick: () =>
                addToCart.mutate(
                  { nftId: item.nftId, editionId: item.editionId, quantity: item.quantity, label: item.name },
                  { onError: (error) => toast.error(`Não foi possível devolver ${item.name}: ${getErrorMessage(error)}`) },
                ),
            },
          })
        },
        onError: (error) => toast.error(getErrorMessage(error)),
        onSettled: () =>
          setRemovingIds((current) => {
            const next = new Set(current)
            next.delete(item.id)
            return next
          }),
      },
    )
  }

  return (
    <div className="container-page pt-4 pb-16 md:pt-6 md:pb-24">
      <MobileScreenHeader title="Carrinho de NFTs" />
      <h1 className="sr-only hidden md:block">Carrinho de NFTs</h1>
      <Breadcrumbs
        items={BREADCRUMBS}
        className="hidden md:block"
        renderLink={(item, props) =>
          item.href === '/#catalogo' ? (
            <Link to="/" hash="catalogo" className={props.className}>
              {props.children}
            </Link>
          ) : (
            <Link to="/" className={props.className}>
              {props.children}
            </Link>
          )
        }
      />

      {cart.isError ? (
        <ErrorState
          className="mt-6"
          title="Não foi possível carregar o carrinho"
          description={getErrorMessage(cart.error)}
          onRetry={() => void cart.refetch()}
          retrying={cart.isFetching}
        />
      ) : isEmpty ? (
        <EmptyState
          className="mt-6"
          icon={<ShoppingCart />}
          title="Seu carrinho está vazio"
          description="Explore o mercado e adicione NFTs para vê-los aqui."
          action={
            <Button asChild>
              <Link to="/" hash="catalogo">
                Explorar o mercado
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-5 grid gap-8 lg:mt-1 lg:grid-cols-[minmax(0,782fr)_minmax(0,331fr)] lg:gap-[87px]">
          <section aria-label="Itens do carrinho" className="min-w-0">
            <CartChangeNotices notices={notices} onDismiss={dismiss} className="mb-4" />

            <div
              aria-hidden="true"
              className={cn('hidden pb-3 text-base leading-5 font-bold text-foreground md:grid', CART_GRID_COLUMNS)}
            >
              <span>NFTs</span>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
            </div>
            <ul className="flex flex-col gap-4 md:gap-3" aria-busy={isLoading || undefined}>
              {isLoading
                ? Array.from({ length: 3 }, (_, index) => <CartLineSkeleton key={index} />)
                : cart.data?.items.map((item) => (
                    <CartLine
                      key={item.id}
                      item={item}
                      quoteLine={linesByItem.get(item.id)}
                      issues={issuesByItem.get(item.id) ?? []}
                      highlighted={noticeItemIds.has(item.id)}
                      removing={removingIds.has(item.id)}
                      onRemove={handleRemove}
                    />
                  ))}
            </ul>
          </section>

          <aside
            aria-labelledby="cart-summary-title"
            className="-mx-4 rounded-t-[28px] bg-surface-card px-6 pt-6 pb-8 md:mx-0 md:rounded-none md:bg-transparent md:p-0"
          >
            <h2
              id="cart-summary-title"
              className="sr-only border-b border-border pb-2.5 text-lg leading-6 font-bold text-foreground md:not-sr-only md:block"
            >
              Resumo da carteira
            </h2>
            <CouponForm
              appliedCode={cart.data?.couponCode ?? null}
              appliedDescription={quote.data?.coupon?.description}
              disabled={isLoading}
              className="hidden md:mt-7 md:block"
            />
            <CouponForm
              variant="mobile"
              appliedCode={cart.data?.couponCode ?? null}
              appliedDescription={quote.data?.coupon?.description}
              disabled={isLoading}
              className="md:hidden"
            />
            <OrderSummary
              className="mt-6 md:mt-7"
              quote={quote.data}
              isLoading={isLoading || quote.isPending}
              isUpdating={quote.isFetching && !quote.isPending}
              isError={quote.isError}
              onRetry={() => void quote.refetch()}
            />
            <CheckoutCta enabled={hasPurchasable} className="mt-7 hidden md:flex" size="md" />
            <CheckoutCta enabled={hasPurchasable} className="mt-7 md:hidden" size="pill-lg" />
            {!hasPurchasable && !isLoading && quote.isSuccess ? (
              <p id="cart-checkout-hint" className="mt-2 text-center text-xs text-text-secondary">
                Nenhum item do carrinho está disponível para compra.
              </p>
            ) : null}
            <div className="mt-3 hidden text-center md:block">
              <Link
                to="/"
                hash="catalogo"
                className="rounded-xs text-sm text-text-accent hover:underline focus-visible:outline-2 focus-visible:outline-text-accent"
              >
                Continuar explorando
              </Link>
            </div>
          </aside>
        </div>
      )}

      <div className="hidden md:block">
        <RelatedNfts excludeIds={cartNftIds} />
      </div>
    </div>
  )
}

function CheckoutCta({ enabled, size, className }: { enabled: boolean; size: 'md' | 'pill-lg'; className?: string }) {
  if (!enabled) {
    return (
      <Button size={size} disabled aria-describedby="cart-checkout-hint" className={cn('w-full', className)}>
        Conectar e finalizar
      </Button>
    )
  }
  // Visitante cai no guard de /pagamento, entra e volta direto para cá.
  return (
    <Button asChild size={size} className={cn('w-full', className)}>
      <Link to="/pagamento">Conectar e finalizar</Link>
    </Button>
  )
}
