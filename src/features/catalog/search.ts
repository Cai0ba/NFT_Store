import { z } from 'zod'
import {
  CATALOG_PAGE_SIZE,
  catalogSortSchema,
  catalogTabSchema,
  categorySchema,
  ethAmountSchema,
  networkSchema,
  type CatalogQuery,
} from '@/shared/contracts'

/**
 * Estado da URL da rota "/". Cada campo tolera lixo de forma isolada (link editado à mão, versão
 * antiga): o valor inválido some e o resto da busca continua valendo.
 */
const optionalList = <T extends string>(item: z.ZodType<T>) =>
  z
    .union([z.array(z.string()), z.string()])
    .transform((value) => {
      const valid = (Array.isArray(value) ? value : [value]).flatMap((v) => {
        const parsed = item.safeParse(v)
        return parsed.success ? [parsed.data] : []
      })
      return valid.length > 0 ? [...new Set(valid)].sort() : undefined
    })
    .optional()
    .catch(undefined)

// O parser de search do router transforma "1.5" em número; o contrato trafega ETH como string.
const optionalEth = z
  .union([z.string(), z.number()])
  .transform((value) => String(value))
  .pipe(ethAmountSchema)
  .optional()
  .catch(undefined)

export const catalogSearchSchema = z.object({
  q: z
    .union([z.string(), z.number()])
    .transform((value) => String(value).trim().slice(0, 80) || undefined)
    .optional()
    .catch(undefined),
  category: optionalList(categorySchema),
  network: optionalList(networkSchema),
  minPrice: optionalEth,
  maxPrice: optionalEth,
  tab: catalogTabSchema.optional().catch(undefined),
  sort: catalogSortSchema.optional().catch(undefined),
  page: z
    .union([z.number(), z.string()])
    .transform((value) => Number(value))
    .pipe(z.number().int().min(1))
    .transform((value) => (value === 1 ? undefined : value))
    .optional()
    .catch(undefined),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

/** Remove chaves vazias para a URL e a chave de cache não variarem com valores equivalentes. */
function compact(search: CatalogSearch): CatalogSearch {
  const out: CatalogSearch = {}
  if (search.q) out.q = search.q
  if (search.category?.length) out.category = [...search.category].sort()
  if (search.network?.length) out.network = [...search.network].sort()
  if (search.minPrice) out.minPrice = search.minPrice
  if (search.maxPrice) out.maxPrice = search.maxPrice
  if (search.tab && search.tab !== 'todos') out.tab = search.tab
  if (search.sort && search.sort !== 'recentes') out.sort = search.sort
  if (search.page && search.page > 1) out.page = search.page
  return out
}

export function toCatalogQuery(search: CatalogSearch): CatalogQuery {
  const { page, ...filters } = compact(search)
  return { ...filters, page: page ?? 1, pageSize: CATALOG_PAGE_SIZE }
}

/** Qualquer mudança de busca, filtro, aba ou ordenação volta para a primeira página. */
export function withFilterChange(search: CatalogSearch, patch: Omit<Partial<CatalogSearch>, 'page'>): CatalogSearch {
  return compact({ ...search, ...patch, page: undefined })
}

export function withPage(search: CatalogSearch, page: number): CatalogSearch {
  return compact({ ...search, page })
}

export function hasActiveFilters(search: CatalogSearch) {
  const { page: _page, tab: _tab, sort: _sort, ...filters } = compact(search)
  return Object.keys(filters).length > 0
}
