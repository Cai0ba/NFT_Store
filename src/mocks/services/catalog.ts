import {
  CATALOG_PAGE_SIZE,
  CATEGORY_LABEL,
  NETWORK_LABEL,
  categorySchema,
  ethAmountSchema,
  networkSchema,
  type CatalogQuery,
  type CatalogResponse,
  type CatalogSort,
  type NftDetailResponse,
} from '@/shared/contracts'
import { compareEth } from '@/shared/lib/money'
import { db } from '../db/store'
import type { NftRecord } from '../db/schema'
import { normalizeText } from '../lib/text'
import { publishNftUpdated } from '../realtime'
import { fail } from './errors'
import { currentPrice, isSoldOut, toDetail, toSummary } from './nft-view'

const TRENDING_POPULARITY = 70
const RELATED_COUNT = 5

type Filter = (nft: NftRecord) => boolean

const digitsOnly = (value: string) => value.replace(/^#?0*/, '')

function matchesSearch(nft: NftRecord, rawQuery: string) {
  const query = normalizeText(rawQuery)
  if (!query) return true
  if (normalizeText(nft.name).includes(query) || normalizeText(nft.collection.name).includes(query)) return true
  // "#0042", "0042" e "42" encontram o mesmo token.
  const token = query.replace(/^#/, '')
  return /^\d+$/.test(token) && digitsOnly(nft.tokenId) === digitsOnly(token)
}

function buildFilters(query: CatalogQuery) {
  const filters: Record<'search' | 'category' | 'network' | 'price' | 'tab', Filter> = {
    search: (n) => matchesSearch(n, query.q ?? ''),
    category: (n) => !query.category?.length || query.category.includes(n.category),
    network: (n) => !query.network?.length || query.network.includes(n.network),
    price: (n) => {
      const price = currentPrice(n)
      if (query.minPrice && compareEth(price, query.minPrice) < 0) return false
      return !(query.maxPrice && compareEth(price, query.maxPrice) > 0)
    },
    tab: (n) => {
      if (query.tab === 'novos') return n.isNewRelease
      if (query.tab === 'em-alta') return n.popularity >= TRENDING_POPULARITY
      return true
    },
  }
  return filters
}

const byRecent = (a: NftRecord, b: NftRecord) => b.listedAt.localeCompare(a.listedAt) || a.id.localeCompare(b.id)

const SORTERS: Record<CatalogSort, (a: NftRecord, b: NftRecord) => number> = {
  recentes: byRecent,
  'menor-preco': (a, b) => compareEth(currentPrice(a), currentPrice(b)) || byRecent(a, b),
  'maior-preco': (a, b) => compareEth(currentPrice(b), currentPrice(a)) || byRecent(a, b),
  populares: (a, b) => b.popularity - a.popularity || byRecent(a, b),
  nome: (a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) || byRecent(a, b),
}

function priceRange(nfts: NftRecord[]) {
  const prices = nfts.map(currentPrice)
  if (prices.length === 0) return { min: '0', max: '0' }
  const sorted = [...prices].sort(compareEth)
  return { min: sorted[0] ?? '0', max: sorted[sorted.length - 1] ?? '0' }
}

function countBy<K extends string>(nfts: NftRecord[], keys: readonly K[], keyOf: (n: NftRecord) => K) {
  const counts = new Map<K, number>(keys.map((k) => [k, 0]))
  for (const nft of nfts) counts.set(keyOf(nft), (counts.get(keyOf(nft)) ?? 0) + 1)
  return counts
}

/** Destaque fixo da barra lateral: a oferta marcada no seed, ou a oferta mais popular ainda à venda. */
function pickFeatured(nfts: NftRecord[]) {
  const candidates = nfts.filter((n) => !isSoldOut(n))
  return (
    candidates.find((n) => n.featured) ??
    [...candidates].filter((n) => toSummary(n).previousPriceEth !== null).sort(SORTERS.populares)[0] ??
    null
  )
}

export function listCatalog(query: CatalogQuery): CatalogResponse {
  const all = db.state.nfts
  const filters = buildFilters(query)
  const except = (skip: keyof typeof filters) => all.filter((n) => Object.entries(filters).every(([k, f]) => k === skip || f(n)))
  const matching = all.filter((n) => Object.values(filters).every((f) => f(n))).sort(SORTERS[query.sort ?? 'recentes'])

  const pageSize = query.pageSize ?? CATALOG_PAGE_SIZE
  const page = query.page ?? 1
  const totalPages = Math.ceil(matching.length / pageSize)
  const categoryCounts = countBy(except('category'), categorySchema.options, (n) => n.category)
  const networkCounts = countBy(except('network'), networkSchema.options, (n) => n.network)
  const withoutPrice = except('price')
  const featured = pickFeatured(all)

  return {
    items: matching.slice((page - 1) * pageSize, page * pageSize).map(toSummary),
    pagination: { page, pageSize, total: matching.length, totalPages },
    facets: {
      categories: categorySchema.options.map((id) => ({ id, label: CATEGORY_LABEL[id], count: categoryCounts.get(id) ?? 0 })),
      networks: networkSchema.options.map((id) => ({ id, label: NETWORK_LABEL[id], count: networkCounts.get(id) ?? 0 })),
      priceRange: priceRange(withoutPrice.length ? withoutPrice : all),
    },
    featured: featured ? toSummary(featured) : null,
  }
}

export function findNft(id: string) {
  return db.state.nfts.find((n) => n.id === id) ?? null
}

export function requireNft(id: string) {
  const nft = findNft(id)
  if (!nft) throw fail.notFound('NFT não encontrado.')
  return nft
}

export function nftDetail(id: string): NftDetailResponse {
  const nft = requireNft(id)
  const others = db.state.nfts.filter((n) => n.id !== nft.id).sort(byRecent)
  const sameCollection = others.filter((n) => n.collection.id === nft.collection.id)
  const sameCategory = others.filter((n) => n.collection.id !== nft.collection.id && n.category === nft.category)
  const related = [...sameCollection, ...sameCategory].slice(0, RELATED_COUNT)
  return { nft: toDetail(nft), related: related.map(toSummary) }
}

export interface NftChange {
  nftId: string
  editionId?: string
  priceEth?: string
  available?: number
}

/** Mudança feita "pelo servidor": grava no banco (o REST passa a refletir) e só então emite o evento. */
export function applyNftChange(change: NftChange) {
  const nft = requireNft(change.nftId)
  const editionId = change.editionId ?? nft.defaultEditionId
  const edition = nft.editions.find((e) => e.id === editionId)
  if (!edition) throw fail.notFound(`Edição inexistente: ${editionId}`)
  const priceEth = change.priceEth === undefined ? undefined : ethAmountSchema.parse(change.priceEth)
  if (change.available !== undefined && (!Number.isInteger(change.available) || change.available < 0)) {
    throw fail.validation({ available: 'Disponibilidade deve ser um inteiro maior ou igual a zero' })
  }
  db.mutate(() => {
    if (priceEth !== undefined) edition.priceEth = priceEth
    if (change.available !== undefined) {
      edition.available = edition.supply === null ? change.available : Math.min(change.available, edition.supply)
    }
    nft.version += 1
  })
  publishNftUpdated(nft)
  return nft
}

/** Baixa de estoque de vários NFTs na confirmação de um pedido. */
export function decrementAvailability(lines: { nftId: string; editionId: string; quantity: number }[]) {
  const touched = new Map<string, NftRecord>()
  db.mutate(() => {
    for (const line of lines) {
      const nft = findNft(line.nftId)
      const edition = nft?.editions.find((e) => e.id === line.editionId)
      if (!nft || !edition) continue
      edition.available = Math.max(0, edition.available - line.quantity)
      if (!touched.has(nft.id)) nft.version += 1
      touched.set(nft.id, nft)
    }
  })
  touched.forEach(publishNftUpdated)
}
