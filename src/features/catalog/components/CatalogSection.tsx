import { Link } from '@tanstack/react-router'
import { ChevronDown, SearchX, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { NftCard } from '@/components/common/NftCard'
import { NftCardSkeleton } from '@/components/common/NftCardSkeleton'
import { useIsDesktop, useMediaQuery } from '@/components/layout/use-media-query'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCatalog } from '@/features/catalog/queries'
import { hasActiveFilters, toCatalogQuery, withFilterChange, type CatalogSearch } from '@/features/catalog/search'
import {
  CATALOG_PAGE_SIZE,
  CATALOG_SORT_LABEL,
  catalogSortSchema,
  type CatalogResponse,
  type CatalogSort,
  type CatalogTab,
} from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'
import { CatalogFilters } from './CatalogFilters'
import { CatalogPagination } from './CatalogPagination'
import { FeaturedCard } from './FeaturedCard'
import { useCatalogNavigate } from './use-catalog-navigate'
import { useNftCardActions } from './use-nft-card-actions'

const TABS: readonly { value: CatalogTab; label: string }[] = [
  { value: 'todos', label: 'Todos os NFTs' },
  { value: 'novos', label: 'Novos lançamentos' },
  { value: 'em-alta', label: 'Em alta' },
]

const clearedFilters = {
  q: undefined,
  category: undefined,
  network: undefined,
  minPrice: undefined,
  maxPrice: undefined,
} as const

export function activeFilterCount(search: CatalogSearch) {
  return (
    (search.category?.length ?? 0) +
    (search.network?.length ?? 0) +
    (search.minPrice || search.maxPrice ? 1 : 0) +
    (search.q ? 1 : 0)
  )
}

type CatalogSectionProps = {
  search: CatalogSearch
  filtersOpen: boolean
  onFiltersOpenChange: (open: boolean) => void
}

export function CatalogSection({ search, filtersOpen, onFiltersOpenChange }: CatalogSectionProps) {
  const query = useCatalog(toCatalogQuery(search))
  const navigate = useCatalogNavigate()
  const isDesktop = useIsDesktop()
  const hasSidebar = useMediaQuery('(min-width: 64rem)')
  const sectionRef = useRef<HTMLElement>(null)
  const page = search.page ?? 1
  const previousPage = useRef(page)

  // Trocar de página pelo rodapé da grade deixaria o usuário no fim da lista nova.
  useEffect(() => {
    if (previousPage.current === page) return
    previousPage.current = page
    const section = sectionRef.current
    if (section && section.getBoundingClientRect().top < 0) section.scrollIntoView({ block: 'start' })
  }, [page])

  const data = query.data
  const tab = search.tab ?? 'todos'
  const sort = search.sort ?? 'recentes'
  const refreshing = query.isPlaceholderData || (query.isFetching && !query.isPending)

  return (
    <section ref={sectionRef} id="catalogo" aria-labelledby="catalogo-titulo" className="container-page mt-6 scroll-mt-6 md:mt-24">
      <h2 id="catalogo-titulo" className="sr-only">
        Catálogo de NFTs
      </h2>
      <div className="lg:grid lg:grid-cols-[310px_minmax(0,1fr)] lg:gap-x-[52px]">
        {hasSidebar ? (
          <aside aria-label="Filtros do catálogo" className="flex flex-col gap-4">
            <div className="bg-surface-card px-5 pt-5 pb-6">
              <CatalogFilters search={search} facets={data?.facets} />
            </div>
            <FeaturedCard nft={data?.featured} loading={query.isPending} />
          </aside>
        ) : (
          <Sheet open={filtersOpen} onOpenChange={onFiltersOpenChange}>
            <SheetContent side={isDesktop ? 'left' : 'bottom'} closeLabel="Fechar filtros" className={cn(isDesktop ? '' : 'h-[88dvh]')}>
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
                <SheetDescription>
                  {data ? `${data.pagination.total} NFTs com os filtros atuais.` : 'Carregando resultados…'}
                </SheetDescription>
              </SheetHeader>
              <SheetBody className="pb-4">
                {isDesktop ? null : <MobileSort value={sort} onChange={(next) => navigate(withFilterChange(search, { sort: next }))} />}
                <CatalogFilters search={search} facets={data?.facets} />
              </SheetBody>
              <SheetFooter>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={!hasActiveFilters(search)}
                  onClick={() => navigate(withFilterChange(search, clearedFilters))}
                >
                  Limpar
                </Button>
                <Button className="flex-1" onClick={() => onFiltersOpenChange(false)}>
                  Ver resultados
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        )}

        <div className="min-w-0">
          <Tabs
            value={tab}
            activationMode="manual"
            onValueChange={(next) => navigate(withFilterChange(search, { tab: next as CatalogTab }))}
          >
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-4">
              <TabsList aria-label="Seleção do catálogo" className="-mx-4 gap-4 px-4 max-lg:w-full md:mx-0 md:gap-6 md:px-0 lg:w-auto">
                {TABS.map((item) => (
                  <TabsTrigger key={item.value} value={item.value} className="max-md:text-base max-md:data-[state=active]:font-bold">
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {isDesktop ? (
                <div className="flex shrink-0 items-center gap-2 max-lg:w-full max-lg:justify-between">
                  {hasSidebar ? null : (
                    <Button variant="outline" size="sm" onClick={() => onFiltersOpenChange(true)} aria-haspopup="dialog">
                      <SlidersHorizontal aria-hidden="true" />
                      Filtros
                      {activeFilterCount(search) > 0 ? <span className="tabular-nums">({activeFilterCount(search)})</span> : null}
                    </Button>
                  )}
                  <SortMenu value={sort} onChange={(next) => navigate(withFilterChange(search, { sort: next }))} />
                </div>
              ) : null}
            </div>

            <TabsContent value={tab} className="mt-6 md:mt-7" tabIndex={-1}>
              <p role="status" className="sr-only">
                {data && !query.isPlaceholderData ? resultsLabel(data, search) : ''}
              </p>
              <CatalogResults
                search={search}
                data={data}
                isPending={query.isPending}
                isError={query.isError && !query.isPlaceholderData}
                refreshing={refreshing}
                retrying={query.isFetching}
                onRetry={() => void query.refetch()}
                variant={isDesktop ? 'desktop-grid' : 'mobile-grid'}
              />
            </TabsContent>
          </Tabs>

          {data && data.pagination.totalPages > 1 ? (
            <CatalogPagination search={search} page={page} totalPages={data.pagination.totalPages} className="mt-10 md:mt-12" />
          ) : null}

          {hasSidebar ? null : <FeaturedCard nft={data?.featured} loading={query.isPending} layout="horizontal" className="mt-10" />}
        </div>
      </div>
    </section>
  )
}

function resultsLabel(data: CatalogResponse, search: CatalogSearch) {
  const { total, page, totalPages } = data.pagination
  if (total === 0) return 'Nenhum NFT encontrado.'
  const base = `${total} ${total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}`
  return totalPages > 1 ? `${base}. Página ${page} de ${totalPages}.` : `${base}.${search.q ? ` Busca: ${search.q}.` : ''}`
}

function CatalogResults({
  search,
  data,
  isPending,
  isError,
  refreshing,
  retrying,
  onRetry,
  variant,
}: {
  search: CatalogSearch
  data: CatalogResponse | undefined
  isPending: boolean
  isError: boolean
  refreshing: boolean
  retrying: boolean
  onRetry: () => void
  variant: 'desktop-grid' | 'mobile-grid'
}) {
  const navigate = useCatalogNavigate()
  const { favoriteProps, cartProps } = useNftCardActions()
  const mobile = variant === 'mobile-grid'
  const gridClass = cn(
    'grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 md:gap-x-6 md:gap-y-[60px] lg:gap-x-8',
    // No mobile a segunda coluna desce 36px (escalonado do Figma) sem mudar a ordem de leitura.
    mobile && 'pb-9 [&>*:nth-child(even)]:translate-y-9',
  )

  if (isError) {
    return (
      <ErrorState
        title="Não foi possível carregar o catálogo"
        description="A conexão com o mercado falhou. Seus filtros foram mantidos."
        onRetry={onRetry}
        retrying={retrying}
      />
    )
  }

  if (isPending || !data) {
    return (
      <div className={gridClass} aria-busy="true" aria-label="Carregando NFTs">
        {Array.from({ length: CATALOG_PAGE_SIZE }, (_, i) => (
          <NftCardSkeleton key={i} variant={variant} />
        ))}
      </div>
    )
  }

  if (data.items.length === 0) {
    const page = search.page ?? 1
    if (page > 1 && data.pagination.total > 0) {
      return (
        <EmptyState
          icon={<SearchX />}
          title="Esta página não existe mais"
          description={`O catálogo tem ${data.pagination.totalPages} ${data.pagination.totalPages === 1 ? 'página' : 'páginas'} com os filtros atuais.`}
          action={
            <Button asChild>
              <Link to="/" search={{ ...search, page: undefined }} resetScroll={false}>
                Ir para a primeira página
              </Link>
            </Button>
          }
        />
      )
    }
    const filtered = hasActiveFilters(search) || (search.tab ?? 'todos') !== 'todos'
    return (
      <EmptyState
        icon={<SearchX />}
        title="Nenhum NFT encontrado"
        description={
          filtered
            ? `Nada corresponde ${search.q ? `a “${search.q}” ` : ''}com os filtros atuais. Tente remover algum filtro.`
            : 'Ainda não há NFTs listados no mercado. Volte em breve.'
        }
        action={
          filtered ? (
            <Button onClick={() => navigate(withFilterChange(search, { ...clearedFilters, tab: undefined }))}>Limpar filtros</Button>
          ) : null
        }
      />
    )
  }

  return (
    <div className="relative">
      {refreshing ? (
        <div aria-hidden="true" className="absolute inset-x-0 -top-3 h-0.5 overflow-hidden rounded-pill bg-border">
          <div className="h-full w-full animate-pulse bg-text-accent" />
        </div>
      ) : null}
      <ul
        aria-busy={refreshing || undefined}
        aria-label="NFTs"
        className={cn(gridClass, 'transition-opacity duration-200', refreshing && 'opacity-60')}
      >
        {data.items.map((nft, index) => (
          <li key={nft.id} className="min-w-0">
            <NftCard
              nft={nft}
              variant={variant}
              priority={index < (mobile ? 2 : 3)}
              headingLevel="h3"
              renderLink={(props) => <Link to="/nft/$nftId" params={{ nftId: nft.id }} {...props} />}
              {...favoriteProps(nft)}
              {...(mobile ? {} : cartProps(nft))}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

function SortMenu({ value, onChange }: { value: CatalogSort; onChange: (sort: CatalogSort) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group inline-flex h-8 cursor-pointer items-center gap-1 rounded-xs text-sm text-foreground hover:text-text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent">
        <span className="text-foreground">Ordenar por:</span>
        <span>{CATALOG_SORT_LABEL[value]}</span>
        <ChevronDown aria-hidden="true" className="size-4 transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={value} onValueChange={(next) => onChange(catalogSortSchema.parse(next))}>
          {catalogSortSchema.options.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {CATALOG_SORT_LABEL[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MobileSort({ value, onChange }: { value: CatalogSort; onChange: (sort: CatalogSort) => void }) {
  return (
    <fieldset className="mb-6">
      <legend className="text-base leading-6 font-bold text-foreground">Ordenar por</legend>
      <RadioGroup value={value} onValueChange={(next) => onChange(catalogSortSchema.parse(next))} className="mt-2 gap-0">
        {catalogSortSchema.options.map((option) => (
          <div key={option} className="flex h-10 items-center gap-3 pl-3">
            <RadioGroupItem id={`ordenar-${option}`} value={option} />
            <Label htmlFor={`ordenar-${option}`} className="cursor-pointer text-[13px] font-normal text-text-secondary">
              {CATALOG_SORT_LABEL[option]}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </fieldset>
  )
}
