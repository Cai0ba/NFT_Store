import { useState } from 'react'
import { DeferredRender } from '@/components/common/DeferredRender'
import { useIsDesktop } from '@/components/layout/use-media-query'
import type { CatalogSearch } from '@/features/catalog/search'
import { activeFilterCount, CatalogSection } from './CatalogSection'
import { BlogSection, PromoSection } from './HomeEditorial'
import { DesktopHero, MobileHero, MobileTopBar } from './HomeHero'

/** Também é o fundo dos modais de login e cadastro no desktop (com a busca padrão). */
export function HomePage({ search }: { search: CatalogSearch }) {
  const isDesktop = useIsDesktop()
  const [filtersOpen, setFiltersOpen] = useState(false)

  return (
    <>
      {isDesktop ? (
        <DesktopHero />
      ) : (
        <>
          <MobileTopBar onOpenFilters={() => setFiltersOpen(true)} activeFilters={activeFilterCount(search)} />
          <MobileHero />
        </>
      )}
      <CatalogSection search={search} filtersOpen={filtersOpen} onFiltersOpenChange={setFiltersOpen} />
      <DeferredRender minHeight={isDesktop ? 760 : 900}>
        <PromoSection />
        <BlogSection />
      </DeferredRender>
    </>
  )
}
