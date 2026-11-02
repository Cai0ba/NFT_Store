import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { withPage, type CatalogSearch } from '@/features/catalog/search'
import { cn } from '@/shared/lib/cn'

type PageSlot = number | 'gap-start' | 'gap-end'

/** Até 7 posições: primeira, última, vizinhas da atual e reticências onde houver salto. */
export function paginationSlots(page: number, totalPages: number): PageSlot[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const start = Math.max(2, Math.min(page - 1, totalPages - 4))
  const end = Math.min(totalPages - 1, Math.max(page + 1, 5))
  const slots: PageSlot[] = [1]
  if (start > 2) slots.push('gap-start')
  for (let n = start; n <= end; n += 1) slots.push(n)
  if (end < totalPages - 1) slots.push('gap-end')
  slots.push(totalPages)
  return slots
}

const squareClass = cn(
  'inline-flex size-[35px] items-center justify-center rounded-xs border text-sm tabular-nums transition-colors',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent',
)

export function CatalogPagination({
  search,
  page,
  totalPages,
  className,
}: {
  search: CatalogSearch
  page: number
  totalPages: number
  className?: string
}) {
  return (
    <nav aria-label="Paginação do catálogo" className={cn('flex justify-end max-md:justify-center', className)}>
      <ul className="flex flex-wrap items-center gap-2.5">
        {page > 1 ? (
          <li>
            <Link
              to="/"
              search={withPage(search, page - 1)}
              resetScroll={false}
              aria-label="Página anterior"
              className={cn(squareClass, 'border-border-soft bg-ink text-foreground hover:border-text-accent hover:text-text-accent')}
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </Link>
          </li>
        ) : null}
        {paginationSlots(page, totalPages).map((slot) =>
          typeof slot === 'number' ? (
            <li key={slot}>
              <Link
                to="/"
                search={withPage(search, slot)}
                resetScroll={false}
                aria-label={`Página ${slot}`}
                aria-current={slot === page ? 'page' : undefined}
                className={cn(
                  squareClass,
                  slot === page
                    ? 'border-primary bg-primary font-bold text-primary-foreground'
                    : 'border-border-soft bg-ink text-foreground hover:border-text-accent hover:text-text-accent',
                )}
              >
                {slot}
              </Link>
            </li>
          ) : (
            <li key={slot} aria-hidden="true" className="px-1 text-text-secondary">
              …
            </li>
          ),
        )}
        {page < totalPages ? (
          <li>
            <Link
              to="/"
              search={withPage(search, page + 1)}
              resetScroll={false}
              aria-label="Próxima página"
              className={cn(squareClass, 'border-border-soft bg-ink text-foreground hover:border-text-accent hover:text-text-accent')}
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  )
}
