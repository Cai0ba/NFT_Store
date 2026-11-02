import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage, hasErrorCode } from '@/api/errors'
import { loginRedirectFor } from '@/components/layout/route-chrome'
import { useSession } from '@/features/auth/session'
import { useAddToCart, useCart } from '@/features/cart/hooks'
import { useFavorites, useToggleFavorite } from '@/features/favorites/hooks'
import type { Edition, NftDetail } from '@/shared/contracts'

/** Edição pedida na URL; sem ela (ou se não existir), a padrão; se a padrão esgotou, a primeira à venda. */
export function resolveEdition(nft: NftDetail, requested: string | undefined): Edition {
  const byId = (id: string | undefined) => nft.editions.find((e) => e.id === id)
  return (
    byId(requested) ??
    (byId(nft.defaultEditionId)?.available ? byId(nft.defaultEditionId) : undefined) ??
    nft.editions.find((e) => e.available > 0) ??
    byId(nft.defaultEditionId) ??
    (nft.editions[0] as Edition)
  )
}

export type PurchaseBlock = { reason: string } | null

/**
 * Estado de compra do detalhe: edição, quantidade (limitada pelo que ainda cabe considerando o que
 * já está no carrinho), favoritos e as duas ações (comprar agora / só adicionar).
 */
export function useNftPurchase(nft: NftDetail, requestedEdition: string | undefined) {
  const navigate = useNavigate()
  const href = useRouterState({ select: (s) => s.location.href })
  const { status } = useSession()
  const edition = resolveEdition(nft, requestedEdition)
  const { data: cart } = useCart()
  const inCart = cart?.items.find((item) => item.editionId === edition.id)?.quantity ?? 0
  const remaining = Math.max(0, edition.available - inCart)

  const [rawQuantity, setQuantity] = useState(1)
  const quantity = Math.min(Math.max(1, rawQuantity), Math.max(1, remaining))

  const addToCart = useAddToCart()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<'buy' | 'add' | null>(null)

  const block: PurchaseBlock =
    edition.available === 0
      ? { reason: 'Edição esgotada' }
      : remaining === 0
        ? { reason: `Você já tem ${inCart === 1 ? 'a última unidade' : `as ${inCart} unidades disponíveis`} desta edição no carrinho.` }
        : null

  const selectEdition = (editionId: string) => {
    setError(null)
    void navigate({
      to: '/nft/$nftId',
      params: { nftId: nft.id },
      search: { edition: editionId === nft.defaultEditionId ? undefined : editionId },
      replace: true,
      resetScroll: false,
    })
  }

  const submit = async (mode: 'buy' | 'add') => {
    if (block || submitting) return
    setError(null)
    setSubmitting(mode)
    try {
      await addToCart.mutateAsync({ nftId: nft.id, editionId: edition.id, quantity, label: nft.name })
      if (mode === 'buy') {
        void navigate({ to: '/carrinho' })
      } else {
        toast.success(`${nft.name} adicionado ao carrinho`, {
          description: `Edição ${edition.label} · ${quantity} ${quantity === 1 ? 'unidade' : 'unidades'}`,
          action: { label: 'Ver carrinho', onClick: () => void navigate({ to: '/carrinho' }) },
        })
      }
    } catch (cause) {
      const message = getErrorMessage(cause)
      setError(hasErrorCode(cause, 'AVAILABILITY_CONFLICT') ? `${message} Ajustamos a quantidade máxima.` : message)
      if (hasErrorCode(cause, 'AVAILABILITY_CONFLICT')) {
        const details = (cause as { details?: { available?: number; inCart?: number } }).details
        if (typeof details?.available === 'number') setQuantity(Math.max(1, details.available - (details.inCart ?? 0)))
      }
    } finally {
      setSubmitting(null)
    }
  }

  const { ids, isEnabled } = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const isFavorite = ids.has(nft.id)
  const onToggleFavorite = () => {
    if (status === 'loading') return
    if (!isEnabled) {
      toast.info('Entre na sua conta para salvar favoritos.')
      void navigate({ to: '/entrar', search: { redirect: loginRedirectFor(href) } })
      return
    }
    toggleFavorite.toggle(nft.id, !isFavorite, nft.name)
  }

  return {
    edition,
    quantity,
    setQuantity: (value: number) => {
      setError(null)
      setQuantity(value)
    },
    remaining,
    inCart,
    block,
    error,
    submitting,
    buy: () => void submit('buy'),
    add: () => void submit('add'),
    selectEdition,
    isFavorite,
    favoritePending: toggleFavorite.isPending(nft.id),
    onToggleFavorite,
  }
}

export type NftPurchase = ReturnType<typeof useNftPurchase>
