import { z } from 'zod'
import { ethAmountSchema, isoDateSchema, networkSchema, paginationSchema } from './common'

export const categorySchema = z.enum([
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
])
export type Category = z.infer<typeof categorySchema>

export const CATEGORY_LABEL: Record<Category, string> = {
  'arte-digital': 'Arte digital',
  fotografia: 'Fotografia',
  musica: 'Música',
  'arte-3d': 'Arte 3D',
  colecionaveis: 'Colecionáveis',
  generativa: 'Generativa',
  jogos: 'Jogos',
  assinaturas: 'Assinaturas',
  utilidade: 'Utilidade',
}

/** Chaves das artes disponíveis em /public/art/{key}-{400|800}.webp */
export const artworkKeySchema = z.enum(['emerald', 'sage', 'ivory', 'golden'])
export type ArtworkKey = z.infer<typeof artworkKeySchema>

export const editionSchema = z.object({
  id: z.string(),
  /** Rótulo exibido no chip: "1/1", "1/10", "1/50", "ABERTA" */
  label: z.string(),
  /** Tiragem total; null para edição aberta */
  supply: z.number().int().positive().nullable(),
  /** Unidades ainda disponíveis para compra */
  available: z.number().int().min(0),
  priceEth: ethAmountSchema,
})
export type Edition = z.infer<typeof editionSchema>

export const nftSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  tokenId: z.string(),
  artwork: artworkKeySchema,
  imageAlt: z.string(),
  collection: z.object({ id: z.string(), name: z.string() }),
  category: categorySchema,
  network: networkSchema,
  /** Menor preço entre as edições disponíveis (ou da edição padrão quando tudo esgotou) */
  priceEth: ethAmountSchema,
  /** Preço anterior, exibido riscado quando houve redução */
  previousPriceEth: ethAmountSchema.nullable(),
  rarity: z.enum(['comum', 'raro']),
  isNewRelease: z.boolean(),
  soldOut: z.boolean(),
  listedAt: isoDateSchema,
  popularity: z.number().int().min(0),
  /** Versão monotônica do recurso; usada para descartar eventos antigos do Socket.IO */
  version: z.number().int().min(1),
})
export type NftSummary = z.infer<typeof nftSummarySchema>

export const nftDetailSchema = nftSummarySchema.extend({
  description: z.string(),
  longDescription: z.array(z.string()),
  attributes: z.array(z.string()),
  editions: z.array(editionSchema).min(1),
  defaultEditionId: z.string(),
  rating: z.object({ average: z.number().min(0).max(5), count: z.number().int().min(0) }),
  contract: z.object({ address: z.string(), standard: z.string(), royaltiesPercent: z.number() }),
  creator: z.string(),
})
export type NftDetail = z.infer<typeof nftDetailSchema>

export const catalogTabSchema = z.enum(['todos', 'novos', 'em-alta'])
export type CatalogTab = z.infer<typeof catalogTabSchema>

export const catalogSortSchema = z.enum(['recentes', 'menor-preco', 'maior-preco', 'populares', 'nome'])
export type CatalogSort = z.infer<typeof catalogSortSchema>

export const CATALOG_SORT_LABEL: Record<CatalogSort, string> = {
  recentes: 'Listados recentemente',
  'menor-preco': 'Menor preço',
  'maior-preco': 'Maior preço',
  populares: 'Mais populares',
  nome: 'Nome (A–Z)',
}

/**
 * Parâmetros de GET /api/nfts. Arrays vão como parâmetros repetidos (?category=a&category=b).
 * O mesmo shape é o estado de busca da rota "/" (com os mesmos nomes).
 */
export const catalogQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.array(categorySchema).optional(),
  network: z.array(networkSchema).optional(),
  minPrice: ethAmountSchema.optional(),
  maxPrice: ethAmountSchema.optional(),
  tab: catalogTabSchema.optional(),
  sort: catalogSortSchema.optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(48).optional(),
})
export type CatalogQuery = z.infer<typeof catalogQuerySchema>

export const CATALOG_PAGE_SIZE = 9

export const facetSchema = z.object({ id: z.string(), label: z.string(), count: z.number().int().min(0) })

export const catalogResponseSchema = z.object({
  items: z.array(nftSummarySchema),
  pagination: paginationSchema,
  facets: z.object({
    categories: z.array(facetSchema),
    networks: z.array(facetSchema),
    priceRange: z.object({ min: ethAmountSchema, max: ethAmountSchema }),
  }),
  /** Destaque da barra lateral ("NFT em destaque / Oferta limitada") */
  featured: nftSummarySchema.nullable(),
})
export type CatalogResponse = z.infer<typeof catalogResponseSchema>

export const nftDetailResponseSchema = z.object({
  nft: nftDetailSchema,
  related: z.array(nftSummarySchema),
})
export type NftDetailResponse = z.infer<typeof nftDetailResponseSchema>
