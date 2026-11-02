import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import * as cartApi from '@/api/endpoints/cart'
import { hasErrorCode } from '@/api/errors'
import { queryKeys, type CartOwnerKey } from '@/api/query-keys'
import { STALE_TIME } from '@/app/query-client'
import { useSession } from '@/features/auth/session'
import { sessionStore } from '@/features/auth/session-store'
import type { AddCartItemRequest, Cart, Network } from '@/shared/contracts'
import { announce } from '@/shared/lib/announcer'
import { getOrCreateGuestCartId } from './guest-cart'
import { dismissCartNotice, useCartNoticeStore, type CartChangeNotice } from './notices'

export type { CartChangeKind, CartChangeNotice } from './notices'

/** Dono atual do carrinho; `null` enquanto a sessão ainda está sendo validada no boot. */
export function getCartOwner(): CartOwnerKey | null {
  const { status, user } = sessionStore.getState()
  if (status === 'loading') return null
  return user ? `user:${user.id}` : `guest:${getOrCreateGuestCartId()}`
}

export function useCartOwner(): CartOwnerKey | null {
  const { status, user } = useSession()
  return useMemo<CartOwnerKey | null>(() => {
    if (status === 'loading') return null
    return user ? `user:${user.id}` : `guest:${getOrCreateGuestCartId()}`
  }, [status, user])
}

export function cartQueryOptions(owner: CartOwnerKey) {
  return queryOptions({
    queryKey: queryKeys.cart.detail(owner),
    queryFn: ({ signal }) => cartApi.getCart({ signal }),
    staleTime: STALE_TIME.cart,
    refetchOnWindowFocus: true,
  })
}

export function cartQuoteQueryOptions(owner: CartOwnerKey, network: Network) {
  return queryOptions({
    queryKey: queryKeys.cart.quote(owner, network),
    queryFn: ({ signal }) => cartApi.getCartQuote(network, { signal }),
    staleTime: STALE_TIME.quote,
    refetchOnWindowFocus: true,
  })
}

/** Respostas de mutations concorrentes podem chegar fora de ordem; a versão do carrinho decide. */
export function storeCart(queryClient: QueryClient, owner: CartOwnerKey, cart: Cart) {
  queryClient.setQueryData<Cart>(queryKeys.cart.detail(owner), (old) => (!old || cart.version >= old.version ? cart : old))
  void queryClient.invalidateQueries({ queryKey: queryKeys.cart.quotes(owner) })
}

// Chave inerte usada só enquanto a sessão é validada (query desabilitada, nunca busca).
const NO_OWNER: CartOwnerKey = 'guest:none'

export function useCart() {
  const owner = useCartOwner()
  return useQuery({ ...cartQueryOptions(owner ?? NO_OWNER), enabled: owner !== null })
}

const countItems = (cart: Cart) => cart.items.reduce((sum, item) => sum + item.quantity, 0)

export function useCartCount(): number {
  const owner = useCartOwner()
  const { data } = useQuery({ ...cartQueryOptions(owner ?? NO_OWNER), enabled: owner !== null, select: countItems })
  return data ?? 0
}

export function useCartQuote(network: Network) {
  const owner = useCartOwner()
  return useQuery({
    ...cartQuoteQueryOptions(owner ?? NO_OWNER, network),
    enabled: owner !== null,
    placeholderData: keepPreviousData,
  })
}

/**
 * Base das mutations de carrinho: grava a resposta do servidor no cache do dono que disparou a ação.
 * Se a sessão mudou no meio do caminho, a resposta é descartada (pertence a outro dono).
 */
function useCartMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<Cart>,
  successMessage: (variables: TVariables, cart: Cart) => string,
  onConflict?: (queryClient: QueryClient, variables: TVariables) => void,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onMutate: () => ({ owner: getCartOwner() }),
    onSuccess: (cart, variables, context) => {
      if (!context.owner || context.owner !== getCartOwner()) return
      storeCart(queryClient, context.owner, cart)
      announce(successMessage(variables, cart))
    },
    onError: (error, variables, context) => {
      if (!context?.owner) return
      if (hasErrorCode(error, 'AVAILABILITY_CONFLICT', 'EDITION_UNAVAILABLE', 'NOT_FOUND')) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.cart.detail(context.owner) })
        onConflict?.(queryClient, variables)
      }
    },
  })
}

export type AddToCartVariables = AddCartItemRequest & { label?: string }

export function useAddToCart() {
  return useCartMutation(
    ({ label: _label, ...body }: AddToCartVariables) => cartApi.addCartItem(body),
    ({ label, quantity }) =>
      `${label ?? 'NFT'} adicionado ao carrinho${quantity > 1 ? ` (${quantity} unidades)` : ''}.`,
    (queryClient, { nftId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.nft.detail(nftId) })
    },
  )
}

export interface UpdateCartItemVariables {
  itemId: string
  quantity: number
  label?: string
}

export function useUpdateCartItem() {
  return useCartMutation(
    ({ itemId, quantity }: UpdateCartItemVariables) => cartApi.updateCartItem(itemId, { quantity }),
    ({ label, quantity }) => `Quantidade${label ? ` de ${label}` : ''} atualizada para ${quantity}.`,
  )
}

export interface RemoveCartItemVariables {
  itemId: string
  label?: string
}

export function useRemoveCartItem() {
  return useCartMutation(
    ({ itemId }: RemoveCartItemVariables) => cartApi.removeCartItem(itemId),
    ({ label }) => `${label ?? 'Item'} removido do carrinho.`,
  )
}

export function useApplyCoupon() {
  return useCartMutation(
    ({ code }: { code: string }) => cartApi.applyCoupon({ code }),
    (_variables, cart) => (cart.couponCode ? `Cupom ${cart.couponCode} aplicado.` : 'Cupom aplicado.'),
  )
}

export function useRemoveCoupon() {
  return useCartMutation(
    (_variables: void) => cartApi.removeCoupon(),
    () => 'Cupom removido.',
  )
}

/** Avisos de preço/disponibilidade vindos do socket, limitados aos itens que ainda estão no carrinho. */
export function useCartChangeNotices(): {
  notices: CartChangeNotice[]
  dismiss(id: string): void
  dismissAll(): void
} {
  const all = useCartNoticeStore()
  const { data: cart } = useCart()
  const notices = useMemo(() => {
    if (!cart) return []
    const itemIds = new Set(cart.items.map((item) => item.id))
    return all.filter((notice) => itemIds.has(notice.itemId))
  }, [all, cart])
  const dismissAll = useCallback(() => notices.forEach((n) => dismissCartNotice(n.id)), [notices])
  return { notices, dismiss: dismissCartNotice, dismissAll }
}
