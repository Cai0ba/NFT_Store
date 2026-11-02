import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { NftCard } from '@/components/common/NftCard'
import { NftCardSkeleton } from '@/components/common/NftCardSkeleton'
import { SectionHeading } from '@/components/common/SectionHeading'
import { catalogQueryOptions } from '@/features/catalog/queries'
import type { CatalogQuery } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'

const RELATED_QUERY: CatalogQuery = { tab: 'em-alta', sort: 'populares', pageSize: 15 }

const slideClass = 'w-[calc((100%-16px)/2)] shrink-0 snap-start md:w-[calc((100%-2*20px)/3)] lg:w-[calc((100%-4*26px)/5)]'

/**
 * "Colecionadores também viram": NFTs em alta que ainda não estão no carrinho. Carrossel com scroll
 * nativo (arrasto e teclado funcionam sem JS); os pontos só pulam de página.
 */
export function RelatedNfts({ excludeIds }: { excludeIds: ReadonlySet<string> }) {
  const headingId = useId()
  const { data, isPending, isError } = useQuery(catalogQueryOptions(RELATED_QUERY))
  const items = useMemo(() => (data?.items ?? []).filter((nft) => !excludeIds.has(nft.id)).slice(0, 15), [data, excludeIds])
  const trackRef = useRef<HTMLUListElement>(null)
  const [pageCount, setPageCount] = useState(1)
  const [page, setPage] = useState(0)

  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    setPageCount(Math.max(1, Math.round(track.scrollWidth / track.clientWidth)))
    setPage(Math.round(track.scrollLeft / track.clientWidth))
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    return () => observer.disconnect()
  }, [measure, items.length])

  if (isError || (!isPending && items.length === 0)) return null

  const goTo = (index: number) => {
    const track = trackRef.current
    if (!track) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    track.scrollTo({ left: index * track.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  return (
    <section aria-labelledby={headingId} className="mt-16 md:mt-24">
      <SectionHeading id={headingId}>Colecionadores também viram</SectionHeading>
      <ul
        ref={trackRef}
        onScroll={measure}
        className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] md:gap-5 lg:gap-[26px] [&::-webkit-scrollbar]:hidden"
      >
        {isPending
          ? Array.from({ length: 5 }, (_, index) => (
              <li key={index} className={slideClass}>
                <NftCardSkeleton variant="compact" />
              </li>
            ))
          : items.map((nft) => (
              <li key={nft.id} className={slideClass}>
                <NftCard
                  nft={nft}
                  variant="compact"
                  renderLink={(props) => <Link to="/nft/$nftId" params={{ nftId: nft.id }} {...props} />}
                />
              </li>
            ))}
      </ul>
      {pageCount > 1 ? (
        <div className="mt-6 flex justify-center gap-2" role="group" aria-label="Páginas do carrossel">
          {Array.from({ length: pageCount }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Página ${index + 1} de ${pageCount}`}
              aria-current={index === page ? 'true' : undefined}
              className="group inline-flex size-6 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-text-accent"
            >
              <span
                className={cn(
                  'size-2.5 rounded-full border border-text-accent transition-colors',
                  index === page ? 'bg-text-accent' : 'bg-transparent group-hover:bg-text-accent/40',
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
