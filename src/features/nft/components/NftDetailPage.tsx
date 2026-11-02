import { Link, useCanGoBack, useRouter } from '@tanstack/react-router'
import { ChevronLeft, CircleAlert, Heart, Info, SearchX, ShoppingCart, X } from 'lucide-react'
import { useLayoutEffect, useState } from 'react'
import { hasErrorCode } from '@/api/errors'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { EditionChips } from '@/components/common/EditionChips'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { EthAddress } from '@/components/common/EthAddress'
import { iconButtonVariants } from '@/components/common/IconButton'
import { artworkSrc, artworkSrcSet } from '@/components/common/NftImage'
import { Price } from '@/components/common/Price'
import { QuantityStepper } from '@/components/common/QuantityStepper'
import { StarRating, ratingCountLabel } from '@/components/common/StarRating'
import { pageTitle } from '@/components/layout/page-title'
import { useIsDesktop } from '@/components/layout/use-media-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNftDetail } from '@/features/nft/queries'
import { CATEGORY_LABEL, NETWORK_LABEL, type Edition, type NftDetail, type NftSummary } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'
import { compareEth, formatEth } from '@/shared/lib/money'
import { NftGallery } from './NftGallery'
import { RelatedNftsCarousel } from './RelatedNftsCarousel'
import { ShareNft } from './ShareNft'
import { useNftPurchase, type NftPurchase } from './use-nft-purchase'

export function NftDetailPage({ nftId, edition }: { nftId: string; edition: string | undefined }) {
  const query = useNftDetail(nftId)
  const isDesktop = useIsDesktop()

  // useLayoutEffect: roda antes do efeito do __root, que aplicaria o título genérico da rota por cima.
  useLayoutEffect(() => {
    if (query.data) document.title = pageTitle(query.data.nft.name)
    else if (hasErrorCode(query.error, 'NOT_FOUND')) document.title = pageTitle('NFT não encontrado')
  }, [query.data, query.error])

  if (query.isPending) return <NftDetailSkeleton desktop={isDesktop} />

  if (query.isError) {
    if (hasErrorCode(query.error, 'NOT_FOUND')) return <NftNotFound />
    return (
      <div className="container-page py-16">
        <h1 className="sr-only">Detalhes do NFT</h1>
        <ErrorState
          title="Não foi possível carregar este NFT"
          description="A conexão com o mercado falhou. Tente de novo em instantes."
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      </div>
    )
  }

  const { nft, related } = query.data
  return (
    <NftDetailContent
      // Trocar de NFT (ex.: pelos relacionados) zera quantidade e avisos do anterior.
      key={nft.id}
      nft={nft}
      related={related}
      requestedEdition={edition}
      desktop={isDesktop}
    />
  )
}

function NftDetailContent({
  nft,
  related,
  requestedEdition,
  desktop,
}: {
  nft: NftDetail
  related: readonly NftSummary[]
  requestedEdition: string | undefined
  desktop: boolean
}) {
  const purchase = useNftPurchase(nft, requestedEdition)
  const change = useLiveChangeNotice(purchase.edition)

  return desktop ? (
    <DesktopDetail nft={nft} related={related} purchase={purchase} change={change} />
  ) : (
    <MobileDetail nft={nft} related={related} purchase={purchase} change={change} />
  )
}

type LiveChange = { message: string; dismiss: () => void } | null

/**
 * O cache do detalhe é atualizado pelo socket; aqui só se compara com o que o usuário viu ao chegar
 * (ou na última vez que dispensou o aviso), para explicar por que o número mudou na frente dele.
 */
function useLiveChangeNotice(edition: Edition): LiveChange {
  const [seen, setSeen] = useState({ id: edition.id, price: edition.priceEth, available: edition.available })
  if (seen.id !== edition.id) {
    setSeen({ id: edition.id, price: edition.priceEth, available: edition.available })
    return null
  }
  const parts: string[] = []
  const priceDiff = compareEth(edition.priceEth, seen.price)
  if (priceDiff !== 0) {
    parts.push(
      `O preço ${priceDiff > 0 ? 'subiu' : 'caiu'} de ${formatEth(seen.price)} para ${formatEth(edition.priceEth)}.`,
    )
  }
  if (edition.available !== seen.available) {
    parts.push(
      edition.available === 0
        ? 'Esta edição acabou de esgotar.'
        : `Disponibilidade atualizada: ${edition.available} ${edition.available === 1 ? 'unidade' : 'unidades'}.`,
    )
  }
  if (parts.length === 0) return null
  return {
    message: parts.join(' '),
    dismiss: () => setSeen({ id: edition.id, price: edition.priceEth, available: edition.available }),
  }
}

function LiveChangeNotice({ change, className }: { change: LiveChange; className?: string }) {
  // A região existe sempre para o leitor de tela anunciar quando o texto aparece.
  return (
    <div role="status" className={className}>
      {change ? (
        <div className="border-warning/50 bg-warning/10 text-foreground flex items-start gap-2 rounded-xs border px-3 py-2 text-[13px] leading-5">
          <Info aria-hidden="true" className="text-warning mt-0.5 size-4 shrink-0" />
          <p className="min-w-0 flex-1">
            <span className="sr-only">Atualização em tempo real: </span>
            {change.message}
          </p>
          <button
            type="button"
            onClick={change.dismiss}
            aria-label="Dispensar aviso de atualização"
            className="text-text-secondary hover:text-foreground focus-visible:outline-text-accent inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-xs focus-visible:outline-2"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  )
}

function PurchaseFeedback({ purchase, className }: { purchase: NftPurchase; className?: string }) {
  const { block, error, remaining, quantity, inCart } = purchase
  return (
    <div className={cn('flex flex-col gap-1.5 text-[13px] leading-5', className)}>
      {block ? (
        <p id="motivo-compra" className="text-warning flex items-center gap-1.5 font-bold">
          <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
          {block.reason}
        </p>
      ) : quantity >= remaining ? (
        <p id="motivo-compra" className="text-text-secondary">
          Máximo disponível: {remaining}
          {inCart > 0 ? ` (você já tem ${inCart} no carrinho)` : ''}
        </p>
      ) : inCart > 0 ? (
        <p className="text-text-secondary">Você já tem {inCart} desta edição no carrinho.</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-danger flex items-start gap-1.5">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  )
}

function InfoList({ nft, className }: { nft: NftDetail; className?: string }) {
  return (
    <dl className={cn('text-text-secondary text-sm leading-8', className)}>
      <div>
        <dt className="inline">ID do token: </dt>
        <dd className="inline">{nft.tokenId}</dd>
      </div>
      <div>
        <dt className="inline">Coleção: </dt>
        <dd className="inline">{nft.collection.name}</dd>
      </div>
      <div>
        <dt className="inline">Atributos: </dt>
        <dd className="inline">{nft.attributes.join(', ')}</dd>
      </div>
    </dl>
  )
}

function DesktopDetail({
  nft,
  related,
  purchase,
  change,
}: {
  nft: NftDetail
  related: readonly NftSummary[]
  purchase: NftPurchase
  change: LiveChange
}) {
  const { edition } = purchase
  const disabledReason = purchase.block ? 'motivo-compra' : undefined

  return (
    <div className="container-page pt-6">
      <Breadcrumbs
        items={[{ label: 'Início', href: '/' }, { label: 'Mercado' }]}
        renderLink={(_item, props) => <Link to="/" {...props} />}
      />
      <div className="mt-3 grid gap-x-[31px] gap-y-10 lg:grid-cols-[minmax(0,574px)_minmax(0,1fr)]">
        <NftGallery nft={nft} />

        <div className="min-w-0">
          <h1 className="text-foreground text-[28px] leading-9 font-bold">{nft.name}</h1>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <Price
              value={edition.priceEth}
              size="xl"
              as="p"
              className="lg:text-2xl"
              srLabel={`Preço da edição ${edition.label}`}
            />
            <StarRating average={nft.rating.average} count={nft.rating.count} />
          </div>
          <LiveChangeNotice change={change} className="mt-3 empty:mt-0" />

          <h2 className="text-foreground mt-5 text-sm leading-6 font-bold">Sobre este NFT:</h2>
          <p className="text-text-secondary mt-1.5 text-sm leading-6">{nft.description}</p>

          <h2 id="edicao-label" className="text-foreground mt-3 text-sm leading-6 font-bold">
            Edição:
          </h2>
          <EditionChips
            editions={nft.editions}
            value={edition.id}
            onValueChange={purchase.selectEdition}
            labelledBy="edicao-label"
            className="mt-2"
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <QuantityStepper
              value={purchase.quantity}
              onValueChange={purchase.setQuantity}
              itemName={nft.name}
              max={Math.max(1, purchase.remaining)}
              disabled={Boolean(purchase.block)}
              size="md"
            />
            <div className="flex flex-wrap gap-2.5">
              <Button
                className="h-[38px] w-[130px] uppercase"
                onClick={purchase.buy}
                loading={purchase.submitting === 'buy'}
                loadingLabel="Adicionando ao carrinho"
                aria-disabled={purchase.block ? true : undefined}
                aria-describedby={disabledReason}
                disabled={Boolean(purchase.block)}
              >
                Comprar
              </Button>
              <Button
                variant="outline"
                className="text-foreground h-[38px] gap-1.5 px-3 font-normal"
                aria-pressed={purchase.isFavorite}
                aria-busy={purchase.favoritePending || undefined}
                onClick={purchase.onToggleFavorite}
              >
                <Heart
                  aria-hidden="true"
                  className={cn('text-text-accent size-[18px]', purchase.isFavorite && 'fill-text-accent')}
                />
                {purchase.isFavorite ? 'Favoritado' : 'Favoritar'}
              </Button>
            </div>
          </div>
          <PurchaseFeedback purchase={purchase} className="mt-2.5" />

          <InfoList nft={nft} className="mt-3" />
          <ShareNft nft={nft} className="mt-1" />
        </div>
      </div>

      <DetailTabs nft={nft} />
      <RelatedNftsCarousel items={related} className="mt-16" />
    </div>
  )
}

function DetailTabs({ nft }: { nft: NftDetail }) {
  return (
    <Tabs defaultValue="detalhes" className="mt-14">
      <TabsList bordered aria-label="Informações do NFT" className="gap-8">
        <TabsTrigger value="detalhes" className="pb-2.5 text-base">
          Detalhes do NFT
        </TabsTrigger>
        <TabsTrigger value="avaliacoes" className="pb-2.5 text-base">
          Avaliações de colecionadores ({nft.rating.count})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="detalhes" className="text-text-secondary mt-4 max-w-[1100px] text-sm leading-6">
        {nft.longDescription.map((paragraph) => (
          <p key={paragraph} className="mb-6 last-of-type:mb-0">
            {paragraph}
          </p>
        ))}
        <dl className="mt-4 flex flex-col gap-3">
          <div>
            <dt className="text-foreground font-bold">Rede:</dt>
            <dd>
              Cunhado na rede {NETWORK_LABEL[nft.network]}, categoria {CATEGORY_LABEL[nft.category]}, criado por{' '}
              {nft.creator}.
            </dd>
          </div>
          <div>
            <dt className="text-foreground font-bold">Contrato:</dt>
            <dd>
              <EthAddress address={nft.contract.address} /> · Contrato inteligente {nft.contract.standard} verificado.
            </dd>
          </div>
          <div>
            <dt className="text-foreground font-bold">Direitos autorais:</dt>
            <dd>
              Direitos autorais do criador: {nft.contract.royaltiesPercent}% nas vendas secundárias, pagos
              automaticamente pelos mercados compatíveis.
            </dd>
          </div>
        </dl>
      </TabsContent>
      <TabsContent value="avaliacoes" className="text-text-secondary mt-4 flex flex-col gap-3 text-sm leading-6">
        <StarRating average={nft.rating.average} count={nft.rating.count} />
        <p>
          Nota média {nft.rating.average.toFixed(1)} de 5 em {ratingCountLabel(nft.rating.count).toLowerCase()}. A
          leitura dos comentários individuais não faz parte desta demonstração.
        </p>
      </TabsContent>
    </Tabs>
  )
}

function MobileDetail({
  nft,
  related,
  purchase,
  change,
}: {
  nft: NftDetail
  related: readonly NftSummary[]
  purchase: NftPurchase
  change: LiveChange
}) {
  const { edition } = purchase
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const backClass = cn(iconButtonVariants({ tone: 'raised', shape: 'circle', size: 'lg' }), 'text-foreground')

  return (
    <div className="pb-[calc(10.5rem+env(safe-area-inset-bottom))]">
      <div className="container-page flex items-center justify-between pt-4">
        {canGoBack ? (
          <button type="button" aria-label="Voltar" onClick={() => router.history.back()} className={backClass}>
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
        ) : (
          <Link to="/" aria-label="Voltar ao início" className={backClass}>
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Link>
        )}
        <button
          type="button"
          aria-label={purchase.isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
          aria-pressed={purchase.isFavorite}
          aria-busy={purchase.favoritePending || undefined}
          onClick={purchase.onToggleFavorite}
          className={cn(backClass, 'text-text-accent')}
        >
          <Heart aria-hidden="true" className={cn('size-5', purchase.isFavorite && 'fill-text-accent')} />
        </button>
      </div>

      <div className="container-page mt-4">
        <img
          src={artworkSrc(nft.artwork, 800)}
          srcSet={artworkSrcSet(nft.artwork)}
          sizes="100vw"
          alt={nft.imageAlt}
          width={800}
          height={720}
          fetchPriority="high"
          loading="eager"
          decoding="async"
          className="bg-surface-raised aspect-[334/301] w-full rounded-t-[20px] object-cover object-top"
        />
      </div>

      <div className="bg-surface-card relative z-10 -mt-1 rounded-t-[32px] px-5 pt-7 pb-8 sm:px-8">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-foreground min-w-0 text-xl leading-7 font-bold">{nft.name}</h1>
          <StarRating average={nft.rating.average} count={nft.rating.count} variant="compact" className="shrink-0" />
        </div>
        <LiveChangeNotice change={change} className="mt-3 empty:mt-0" />
        <p className="text-text-secondary mt-3 text-[15px] leading-[22px]">{nft.description}</p>
        <h2 id="edicao-label-mobile" className="text-foreground mt-4 text-[15px] leading-6 font-bold">
          Edição:
        </h2>
        <EditionChips
          editions={nft.editions}
          value={edition.id}
          onValueChange={purchase.selectEdition}
          labelledBy="edicao-label-mobile"
          size="lg"
          className="mt-3"
        />
        <InfoList nft={nft} className="mt-4 text-[15px] leading-[30px]" />
        <ShareNft nft={nft} className="mt-2" />
        <RelatedNftsCarousel items={related} className="mt-10" />
      </div>

      <div
        className="bg-surface-raised fixed inset-x-0 bottom-0 z-40 rounded-t-[32px] px-5 pt-5 shadow-[0_-8px_24px_rgb(10_6_4/0.5)] sm:px-8"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="text-text-secondary text-[15px]">
              Qtd.
            </span>
            <QuantityStepper
              value={purchase.quantity}
              onValueChange={purchase.setQuantity}
              itemName={nft.name}
              max={Math.max(1, purchase.remaining)}
              disabled={Boolean(purchase.block)}
              size="md"
            />
          </div>
          <Price value={edition.priceEth} size="xl" as="p" srLabel={`Preço da edição ${edition.label}`} />
        </div>
        <PurchaseFeedback purchase={purchase} className="mt-2 empty:mt-0" />
        <div className="mt-3 flex items-center gap-4">
          <Button
            size="pill-lg"
            className="flex-1"
            onClick={purchase.buy}
            loading={purchase.submitting === 'buy'}
            loadingLabel="Adicionando ao carrinho"
            disabled={Boolean(purchase.block)}
            aria-describedby={purchase.block ? 'motivo-compra' : undefined}
          >
            Comprar NFT
          </Button>
          <button
            type="button"
            onClick={purchase.add}
            aria-label={`Adicionar ${nft.name} ao carrinho`}
            aria-busy={purchase.submitting === 'add' || undefined}
            aria-describedby={purchase.block ? 'motivo-compra' : undefined}
            disabled={Boolean(purchase.block)}
            className={cn(
              'border-border bg-surface-card text-text-accent inline-flex size-14 shrink-0 cursor-pointer items-center justify-center rounded-full border',
              'hover:bg-ink focus-visible:outline-text-accent focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <ShoppingCart
              aria-hidden="true"
              className={cn('size-6', purchase.submitting === 'add' && 'animate-pulse')}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

export function NftNotFound() {
  return (
    <div className="container-page py-16 md:py-24">
      <EmptyState
        headingLevel="h2"
        icon={<SearchX />}
        title="NFT não encontrado"
        description="Este NFT não existe ou foi removido do mercado. Confira o endereço ou continue explorando o catálogo."
        action={
          <Button asChild>
            <Link to="/" hash="catalogo">
              Explorar o mercado
            </Link>
          </Button>
        }
      />
      <h1 className="sr-only">NFT não encontrado</h1>
    </div>
  )
}

function NftDetailSkeleton({ desktop }: { desktop: boolean }) {
  if (!desktop) {
    return (
      <div aria-busy="true" aria-label="Carregando NFT" className="pb-40">
        <div className="container-page flex justify-between pt-4">
          <Skeleton className="size-11 rounded-full" />
          <Skeleton className="size-11 rounded-full" />
        </div>
        <div className="container-page mt-4">
          <Skeleton className="aspect-[334/301] w-full rounded-t-[20px] rounded-b-none" />
        </div>
        <div className="bg-surface-card rounded-t-[32px] px-5 pt-7 pb-8">
          <Skeleton className="h-6 w-3/5" />
          <Skeleton className="mt-5 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-11/12" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <Skeleton className="mt-6 h-9 w-full" />
        </div>
      </div>
    )
  }
  return (
    // min-h-dvh: o conteúdo real é mais alto que a tela; sem isso o rodapé aparece e depois é empurrado (CLS).
    <div aria-busy="true" aria-label="Carregando NFT" className="container-page min-h-dvh pt-6">
      <Skeleton className="h-5 w-36" />
      <div className="mt-3 grid gap-x-[31px] lg:grid-cols-[minmax(0,574px)_minmax(0,1fr)]">
        <div className="grid grid-cols-[minmax(0,101px)_minmax(0,1fr)] gap-x-[26px]">
          <div className="flex flex-col gap-3.5">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-md" />
            ))}
          </div>
          <div className="bg-surface-card p-5">
            <Skeleton className="aspect-square w-full rounded-lg" />
          </div>
        </div>
        <div className="flex flex-col">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="mt-4 h-7 w-28" />
          <Skeleton className="mt-6 h-4 w-32" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
          <Skeleton className="mt-5 h-7 w-56" />
          <Skeleton className="mt-5 h-11 w-full" />
          <Skeleton className="mt-5 h-24 w-1/2" />
        </div>
      </div>
      <Skeleton className="mt-14 h-8 w-80" />
      <Skeleton className="mt-4 h-24 w-full" />
    </div>
  )
}
