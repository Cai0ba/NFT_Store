import { ArrowRight, Search, SlidersHorizontal } from 'lucide-react'
import { artworkSrc, artworkSrcSet } from '@/components/common/NftImage'
import { Button } from '@/components/ui/button'
import { cn } from '@/shared/lib/cn'
import { HERO } from './editorial'
import { useCatalogSearchInput } from './use-catalog-search-input'

/** Rola até o catálogo e leva o foco junto, para quem navega por teclado não ficar para trás no hero. */
export function scrollToCatalog() {
  const section = document.getElementById('catalogo')
  if (!section) return
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  const tab = section.querySelector<HTMLElement>('[role="tab"][data-state="active"]')
  tab?.focus({ preventScroll: true })
}

function CarouselDots({ className }: { className?: string }) {
  // A arte do hero é estática; os pontos reproduzem o Figma e ficam fora da árvore de acessibilidade.
  return (
    <span aria-hidden="true" className={cn('flex gap-1.5', className)}>
      <span className="size-[7px] rounded-full bg-text-accent" />
      <span className="size-[7px] rounded-full bg-text-accent/80" />
      <span className="size-[7px] rounded-full bg-text-accent/80" />
    </span>
  )
}

export function DesktopHero() {
  return (
    <section aria-labelledby="hero-titulo" className="container-page pt-8">
      <div className="grid items-start gap-x-10 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:grid-cols-[minmax(0,1fr)_446px]">
        <div className="relative flex h-full flex-col pt-11 lg:pt-12">
          <p className="text-sm leading-5 text-foreground">{HERO.eyebrow}</p>
          <h1
            id="hero-titulo"
            className="mt-3 text-[28px] leading-[46px] font-bold tracking-[0.02em] text-foreground uppercase lg:mt-2 lg:text-[36px] lg:leading-[60px] xl:text-display xl:leading-[70px]"
          >
            {HERO.title[0]}
            <br />
            {HERO.title[1]}
          </h1>
          <p className="mt-3 max-w-[560px] text-sm leading-6 text-text-secondary">{HERO.description}</p>
          <Button className="mt-10 h-10 w-[139px] uppercase" onClick={scrollToCatalog}>
            {HERO.cta}
          </Button>
          <CarouselDots className="absolute right-0 bottom-6 lg:right-[64px] lg:bottom-6" />
        </div>
        <img
          src={artworkSrc(HERO.artwork, 800)}
          srcSet={artworkSrcSet(HERO.artwork)}
          sizes="(min-width: 1024px) 446px, 320px"
          width={446}
          height={446}
          alt={HERO.imageAlt}
          fetchPriority="high"
          loading="eager"
          decoding="async"
          className="hidden aspect-square w-full rounded-[20px] bg-surface-raised object-cover md:block"
        />
      </div>
    </section>
  )
}

export function MobileTopBar({ onOpenFilters, activeFilters }: { onOpenFilters: () => void; activeFilters: number }) {
  const { value, setValue, submit } = useCatalogSearchInput()

  return (
    <div className="container-page flex items-center gap-3 pt-5">
      <form
        role="search"
        aria-label="Buscar NFTs"
        className="relative min-w-0 flex-1"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
          ;(document.activeElement as HTMLElement | null)?.blur()
        }}
      >
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-text-accent" />
        <label htmlFor="mobile-search" className="sr-only">
          Explorar coleções: busque por nome, coleção ou ID do token
        </label>
        <input
          id="mobile-search"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Explorar coleções"
          className={cn(
            'h-[46px] w-full rounded-md border border-transparent bg-surface-card pr-3 pl-11 text-base text-foreground',
            'placeholder:text-[15px] placeholder:text-text-secondary focus-visible:border-text-accent focus-visible:outline-none',
            '[&::-webkit-search-cancel-button]:hidden',
          )}
        />
      </form>
      <button
        type="button"
        onClick={onOpenFilters}
        aria-haspopup="dialog"
        aria-label={activeFilters > 0 ? `Filtros e ordenação, ${activeFilters} ativos` : 'Filtros e ordenação'}
        className="relative inline-flex size-[46px] shrink-0 cursor-pointer items-center justify-center rounded-md bg-[linear-gradient(135deg,var(--color-text-accent),var(--color-primary))] text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent"
      >
        <SlidersHorizontal aria-hidden="true" className="size-5" />
        {activeFilters > 0 ? (
          <span aria-hidden="true" className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-ink">
            {activeFilters}
          </span>
        ) : null}
      </button>
    </div>
  )
}

export function MobileHero() {
  return (
    <section aria-labelledby="hero-titulo" className="container-page mt-4">
      <div className="relative isolate overflow-hidden rounded-[20px] bg-[linear-gradient(120deg,#6b4630_0%,#4b2f1f_55%,#3a2417_100%)] py-3 pr-3 pl-4">
        {/* Círculos do fundo do card, como no Figma. */}
        <span aria-hidden="true" className="absolute -top-16 left-[36%] -z-10 size-56 rounded-full bg-[#7a5238]/35" />
        <span aria-hidden="true" className="absolute -bottom-24 -left-10 -z-10 size-52 rounded-full bg-[#2d1b12]/45" />
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] leading-5 text-foreground">{HERO.eyebrow}</p>
            <h1 id="hero-titulo" className="mt-1.5 text-lg leading-[30px] font-bold text-foreground uppercase">
              {HERO.mobileTitle[0]}
              <br />
              {HERO.mobileTitle[1]}
            </h1>
            <p className="mt-1 text-[13px] leading-[18px] text-text-secondary">{HERO.mobileDescription}</p>
            <button
              type="button"
              onClick={scrollToCatalog}
              className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xs text-[13px] leading-5 font-bold text-text-accent uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent"
            >
              {HERO.cta}
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
          </div>
          <div className="relative w-[40%] max-w-[150px] shrink-0 self-start pb-2">
            <img
              src={artworkSrc(HERO.artwork)}
              width={400}
              height={400}
              alt={HERO.imageAlt}
              fetchPriority="high"
              loading="eager"
              decoding="async"
              className="aspect-square w-full rounded-lg bg-surface-raised object-cover"
            />
            <img
              src={artworkSrc(HERO.secondaryArtwork)}
              width={400}
              height={400}
              alt=""
              loading="eager"
              decoding="async"
              className="absolute bottom-0 -left-3 aspect-square w-[42%] rounded-md border-2 border-[#4b2f1f] bg-surface-raised object-cover"
            />
          </div>
        </div>
        <CarouselDots className="mt-1 justify-center" />
      </div>
    </section>
  )
}
