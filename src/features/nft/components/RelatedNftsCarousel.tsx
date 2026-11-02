import { Link } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { NftCard } from '@/components/common/NftCard'
import { SectionHeading } from '@/components/common/SectionHeading'
import { useNftCardActions } from '@/features/catalog/components/use-nft-card-actions'
import type { NftSummary } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'

/**
 * Carrossel por rolagem nativa (scroll-snap): funciona com toque, trackpad e teclado (os cards são
 * links focáveis e o foco rola a faixa). Os pontos só aparecem quando há mais de uma página.
 */
export function RelatedNftsCarousel({ items, className }: { items: readonly NftSummary[]; className?: string }) {
  const trackRef = useRef<HTMLUListElement>(null)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(0)
  const { favoriteProps, cartProps } = useNftCardActions()

  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const total = Math.max(1, Math.round(track.scrollWidth / track.clientWidth))
    setPages(total)
    setPage(Math.min(total - 1, Math.round(track.scrollLeft / track.clientWidth)))
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    return () => observer.disconnect()
  }, [measure, items.length])

  const goTo = (index: number) => {
    const track = trackRef.current
    if (!track) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    track.scrollTo({ left: index * track.clientWidth, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  if (items.length === 0) return null

  return (
    <section aria-labelledby="relacionados-titulo" className={className}>
      <SectionHeading id="relacionados-titulo">Mais desta coleção</SectionHeading>
      <ul
        ref={trackRef}
        onScroll={measure}
        className={cn(
          'mt-8 grid snap-x snap-mandatory auto-cols-[calc((100%-16px)/2)] grid-flow-col gap-4 overflow-x-auto pb-2',
          'md:auto-cols-[calc((100%-48px)/3)] md:gap-6 lg:auto-cols-[calc((100%-96px)/5)]',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {items.map((nft) => (
          <li key={nft.id} className="min-w-0 snap-start">
            <NftCard
              nft={nft}
              variant="compact"
              headingLevel="h3"
              renderLink={(props) => <Link to="/nft/$nftId" params={{ nftId: nft.id }} {...props} />}
              {...favoriteProps(nft)}
              {...cartProps(nft)}
            />
          </li>
        ))}
      </ul>
      {pages > 1 ? (
        <div role="group" aria-label="Páginas do carrossel" className="mt-6 flex justify-center gap-1.5">
          {Array.from({ length: pages }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Página ${index + 1} de ${pages}`}
              aria-current={index === page ? 'true' : undefined}
              onClick={() => goTo(index)}
              className="group inline-flex size-6 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-text-accent"
            >
              <span
                aria-hidden="true"
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
