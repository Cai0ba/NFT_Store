import { catalogQuerySchema, catalogResponseSchema, nftDetailResponseSchema } from '@/shared/contracts'
import { listCatalog, nftDetail } from '../services/catalog'
import { parseOrFail } from '../services/errors'
import { jsonResponse } from './respond'
import { route } from './route'

/** Aceita `category=a&category=b` e também `category[]=a`, que é o padrão do Axios sem serializer próprio. */
function readList(params: URLSearchParams, name: string) {
  const values = [...params.getAll(name), ...params.getAll(`${name}[]`)].filter(Boolean)
  return values.length ? values : undefined
}

const readNumber = (value: string | null) => (value === null || value === '' ? undefined : Number(value))
const readText = (value: string | null) => (value === null || value === '' ? undefined : value)

function readCatalogQuery(url: URL) {
  const p = url.searchParams
  return parseOrFail(catalogQuerySchema, {
    q: readText(p.get('q')),
    category: readList(p, 'category'),
    network: readList(p, 'network'),
    minPrice: readText(p.get('minPrice')),
    maxPrice: readText(p.get('maxPrice')),
    tab: readText(p.get('tab')),
    sort: readText(p.get('sort')),
    page: readNumber(p.get('page')),
    pageSize: readNumber(p.get('pageSize')),
  })
}

export const catalogHandlers = [
  route('get', '/nfts', ({ url }) => jsonResponse(catalogResponseSchema, listCatalog(readCatalogQuery(url)))),
  route('get', '/nfts/:id', ({ params }) => jsonResponse(nftDetailResponseSchema, nftDetail(params.id ?? ''))),
]
