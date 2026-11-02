import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/api/errors'
import { loginRedirectFor } from '@/components/layout/route-chrome'
import { useSession } from '@/features/auth/session'
import { useAddToCart } from '@/features/cart/hooks'
import { useFavorites, useToggleFavorite } from '@/features/favorites/hooks'
import { nftDetailQueryOptions } from '@/features/nft/queries'
import type { NftSummary } from '@/shared/contracts'

/**
 * Ações dos cards (favoritar e carrinho) compartilhadas entre o catálogo e "Mais desta coleção".
 *
 * O resumo do catálogo não traz edições. O carrinho do card busca o detalhe (normalmente já em cache
 * pelo preload do link) e adiciona 1 unidade da edição padrão; se ela estiver esgotada mas houver
 * outra edição, leva ao detalhe para o colecionador escolher, em vez de decidir por ele.
 */
export function useNftCardActions() {
  const { status } = useSession()
  const { ids, isEnabled } = useFavorites()
  const { toggle, isPending: favoritePending } = useToggleFavorite()
  const navigate = useNavigate()
  const href = useRouterState({ select: (s) => s.location.href })
  const queryClient = useQueryClient()
  const addToCart = useAddToCart()
  const [adding, setAdding] = useState<ReadonlySet<string>>(new Set())

  const setAddingFlag = (id: string, value: boolean) =>
    setAdding((current) => {
      const next = new Set(current)
      if (value) next.add(id)
      else next.delete(id)
      return next
    })

  const goToLogin = useCallback(() => {
    toast.info('Entre na sua conta para salvar favoritos.')
    void navigate({ to: '/entrar', search: { redirect: loginRedirectFor(href) } })
  }, [href, navigate])

  const favoriteProps = (nft: NftSummary) => ({
    isFavorite: ids.has(nft.id),
    favoritePending: favoritePending(nft.id),
    onToggleFavorite: (next: boolean) => {
      if (status === 'loading') return
      if (!isEnabled) return goToLogin()
      toggle(nft.id, next, nft.name)
    },
  })

  const quickAdd = async (nft: NftSummary) => {
    if (adding.has(nft.id)) return
    setAddingFlag(nft.id, true)
    try {
      const { nft: detail } = await queryClient.query(nftDetailQueryOptions(nft.id))
      const edition = detail.editions.find((e) => e.id === detail.defaultEditionId)
      if (!edition || edition.available === 0) {
        toast.info(`A edição padrão de ${nft.name} está esgotada.`, { description: 'Escolha outra edição no detalhe do NFT.' })
        void navigate({ to: '/nft/$nftId', params: { nftId: nft.id } })
        return
      }
      await addToCart.mutateAsync({ nftId: nft.id, editionId: edition.id, quantity: 1, label: nft.name })
      toast.success(`${nft.name} adicionado ao carrinho`, {
        description: `Edição ${edition.label}`,
        action: { label: 'Ver carrinho', onClick: () => void navigate({ to: '/carrinho' }) },
      })
    } catch (error) {
      toast.error(`Não foi possível adicionar ${nft.name}`, { description: getErrorMessage(error) })
    } finally {
      setAddingFlag(nft.id, false)
    }
  }

  const cartProps = (nft: NftSummary) => ({
    onAddToCart: () => void quickAdd(nft),
    addToCartPending: adding.has(nft.id),
  })

  return { favoriteProps, cartProps }
}
