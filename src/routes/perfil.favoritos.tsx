import { useQueries } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { NftCard } from '@/components/common/NftCard'
import { NftCardSkeleton } from '@/components/common/NftCardSkeleton'
import { pageTitle } from '@/components/layout/page-title'
import { Button } from '@/components/ui/button'
import { getErrorMessage, hasErrorCode } from '@/api/errors'
import { useAddToCart } from '@/features/cart/hooks'
import { useFavorites, useToggleFavorite } from '@/features/favorites/hooks'
import { nftDetailQueryOptions } from '@/features/nft/queries'
import type { NftDetail } from '@/shared/contracts'

export const Route = createFileRoute('/perfil/favoritos')({
  head: () => ({ meta: [{ title: pageTitle('Lista de interesse') }] }),
  component: FavoritesPage,
})

const GRID = 'grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:gap-x-3'

function FavoritesPage() {
  const favorites = useFavorites()
  const { toggle, isPending } = useToggleFavorite()
  const addToCart = useAddToCart()
  const ids = [...favorites.ids]

  // Cada NFT vem do cache do detalhe (o mesmo do /nft/$id); o socket mantém preço e estoque em dia.
  const details = useQueries({
    queries: ids.map((id) => nftDetailQueryOptions(id)),
  })

  const handleAddToCart = (nft: NftDetail) => {
    const edition = nft.editions.find((e) => e.id === nft.defaultEditionId && e.available > 0) ?? nft.editions.find((e) => e.available > 0)
    if (!edition) return
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity: 1, label: nft.name },
      {
        onSuccess: () => toast.success(`${nft.name} adicionado ao carrinho.`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  const heading = (
    <h2 id="favorites-title" className="text-[15px] leading-6 font-bold text-foreground">
      Lista de interesse
      {favorites.ids.size > 0 ? <span className="ml-2 font-bold text-text-accent">({favorites.ids.size})</span> : null}
    </h2>
  )

  if (favorites.isError) {
    return (
      <section aria-labelledby="favorites-title">
        {heading}
        <ErrorState className="mt-6" title="Não foi possível carregar sua lista" description="Tente novamente em instantes." />
      </section>
    )
  }

  return (
    <section aria-labelledby="favorites-title">
      {heading}
      {favorites.isLoading ? (
        <div className={`${GRID} mt-6`} aria-busy="true">
          {Array.from({ length: 3 }, (_, index) => (
            <NftCardSkeleton key={index} />
          ))}
        </div>
      ) : ids.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<Heart />}
          title="Sua lista de interesse está vazia"
          description="Toque no coração de um NFT para acompanhá-lo aqui."
          action={
            <Button asChild>
              <Link to="/" hash="catalogo">
                Explorar o mercado
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className={`${GRID} mt-6`}>
          {ids.map((id, index) => {
            const query = details[index]
            if (!query || query.isPending) {
              return (
                <li key={id}>
                  <NftCardSkeleton />
                </li>
              )
            }
            // NFT removido do catálogo some da lista em vez de quebrar a grade.
            if (hasErrorCode(query.error, 'NOT_FOUND')) return null
            if (query.isError || !query.data) {
              return (
                <li key={id}>
                  <ErrorState
                    className="h-full py-6"
                    headingLevel="h3"
                    title="NFT indisponível"
                    description={getErrorMessage(query.error)}
                    onRetry={() => void query.refetch()}
                    retrying={query.isFetching}
                  />
                </li>
              )
            }
            const nft = query.data.nft
            return (
              <li key={id}>
                <NftCard
                  nft={nft}
                  variant="desktop-grid"
                  headingLevel="h3"
                  renderLink={(props) => <Link to="/nft/$nftId" params={{ nftId: nft.id }} {...props} />}
                  isFavorite
                  favoritePending={isPending(nft.id)}
                  onToggleFavorite={(next) => toggle(nft.id, next, nft.name)}
                  onAddToCart={() => handleAddToCart(nft)}
                  addToCartPending={addToCart.isPending && addToCart.variables?.nftId === nft.id}
                />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
