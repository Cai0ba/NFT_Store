import { Check } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { hasActiveFilters, withFilterChange, type CatalogSearch } from '@/features/catalog/search'
import type { CatalogResponse, Category, Network } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'
import { useCatalogNavigate } from './use-catalog-navigate'

type Facets = CatalogResponse['facets']

const toggle = <T extends string>(list: readonly T[] | undefined, value: T): T[] | undefined => {
  const next = list?.includes(value) ? list.filter((v) => v !== value) : [...(list ?? []), value]
  return next.length ? next : undefined
}

// Exibição em pt-BR ("0,02 – 12,30 ETH"), como no Figma; o valor que vai para a URL continua "0.02".
const formatRangeValue = (value: number) => value.toFixed(2).replace('.', ',')

export function CatalogFilters({ search, facets, className }: { search: CatalogSearch; facets: Facets | undefined; className?: string }) {
  const navigate = useCatalogNavigate()
  const ids = useId()

  return (
    <div className={cn('flex flex-col', className)}>
      <FacetGroup
        headingId={`${ids}-colecoes`}
        title="Coleções"
        items={facets?.categories}
        selected={search.category}
        onToggle={(id) => navigate(withFilterChange(search, { category: toggle(search.category, id as Category) }))}
      />

      <PriceFilter
        key={`${search.minPrice}-${search.maxPrice}-${facets?.priceRange.min}-${facets?.priceRange.max}`}
        search={search}
        range={facets?.priceRange}
        onApply={(minPrice, maxPrice) => navigate(withFilterChange(search, { minPrice, maxPrice }))}
      />

      <FacetGroup
        headingId={`${ids}-rede`}
        title="Rede"
        items={facets?.networks}
        selected={search.network}
        onToggle={(id) => navigate(withFilterChange(search, { network: toggle(search.network, id as Network) }))}
        className="mt-6"
      />

      {hasActiveFilters(search) ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-6 self-start"
          onClick={() =>
            navigate(
              withFilterChange(search, {
                q: undefined,
                category: undefined,
                network: undefined,
                minPrice: undefined,
                maxPrice: undefined,
              }),
            )
          }
        >
          Limpar filtros
        </Button>
      ) : null}
    </div>
  )
}

function FacetGroup({
  headingId,
  title,
  items,
  selected,
  onToggle,
  className,
}: {
  headingId: string
  title: string
  items: Facets['categories'] | undefined
  selected: readonly string[] | undefined
  onToggle: (id: string) => void
  className?: string
}) {
  return (
    <section aria-labelledby={headingId} className={className}>
      <h3 id={headingId} className="text-base leading-6 font-bold text-foreground">
        {title}
      </h3>
      <ul className="mt-1.5">
        {items
          ? items.map((item) => {
              const active = selected?.includes(item.id) ?? false
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggle(item.id)}
                    className={cn(
                      'group flex h-10 w-full cursor-pointer items-center gap-2 rounded-xs pr-1 pl-3 text-left text-[13px] transition-colors',
                      'hover:text-text-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-text-accent',
                      active ? 'font-bold text-text-accent' : 'text-text-secondary',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {active ? <Check aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={3} /> : null}
                    <span className="shrink-0 text-[15px] font-bold text-text-accent tabular-nums">
                      <span aria-hidden="true">({item.count})</span>
                      <span className="sr-only">, {item.count} resultados</span>
                    </span>
                  </button>
                </li>
              )
            })
          : Array.from({ length: title === 'Rede' ? 3 : 9 }, (_, i) => (
              <li key={i} aria-hidden="true" className="flex h-10 items-center justify-between pl-3">
                <span className="skeleton h-3 w-24" />
                <span className="skeleton h-3 w-8" />
              </li>
            ))}
      </ul>
    </section>
  )
}

function PriceFilter({
  search,
  range,
  onApply,
}: {
  search: CatalogSearch
  range: Facets['priceRange'] | undefined
  onApply: (min: string | undefined, max: string | undefined) => void
}) {
  const headingId = useId()
  const bounds: [number, number] = range
    ? [Math.floor(Number(range.min) * 100) / 100, Math.ceil(Number(range.max) * 100) / 100]
    : [0, 0]
  const initial: [number, number] = [
    search.minPrice ? Math.max(Number(search.minPrice), bounds[0]) : bounds[0],
    search.maxPrice ? Math.min(Number(search.maxPrice), bounds[1]) : bounds[1],
  ]
  const [value, setValue] = useState<[number, number]>(initial)
  const disabled = !range || bounds[0] === bounds[1]

  const apply = () => {
    const [min, max] = value
    const minText = min.toFixed(2)
    const maxText = max.toFixed(2)
    // Encostado no limite da faixa equivale a "sem limite": a URL fica limpa e novos NFTs mais caros continuam aparecendo.
    onApply(
      min <= bounds[0] ? undefined : minText,
      max >= bounds[1] ? undefined : maxText,
    )
  }

  return (
    <section aria-labelledby={headingId} className="mt-6">
      <h3 id={headingId} className="text-base leading-6 font-bold text-foreground">
        Faixa de preço
      </h3>
      <div className="mt-3 px-1.5">
        <Slider
          min={bounds[0]}
          max={bounds[1]}
          step={0.01}
          minStepsBetweenThumbs={0}
          value={value}
          onValueChange={(next) => setValue([next[0] ?? bounds[0], next[1] ?? bounds[1]])}
          disabled={disabled}
          thumbLabels={['Preço mínimo', 'Preço máximo']}
          formatValueText={(v) => `${formatRangeValue(v)} ether`}
        />
      </div>
      <p className="mt-2.5 text-[13px] leading-6 text-foreground tabular-nums">
        Preço: {formatRangeValue(value[0])} – {formatRangeValue(value[1])} ETH
      </p>
      <Button size="sm" className="mt-1.5 h-[30px] px-2.5 text-[13px]" onClick={apply} disabled={disabled}>
        Aplicar
        <span className="sr-only"> faixa de preço</span>
      </Button>
    </section>
  )
}
