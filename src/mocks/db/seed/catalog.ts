import {
  NETWORK_LABEL,
  categorySchema,
  type ArtworkKey,
  type Category,
  type Edition,
  type Network,
} from '@/shared/contracts'
import { createPrng, type Prng } from '../../lib/prng'
import { stableHash } from '../../lib/hash'
import { isoAt } from '../../lib/text'
import type { NftRecord } from '../schema'
import { DAY_MS, HOUR_MS, SEED_BASE_TIME } from './constants'

const LISTING_STEP_MS = 11 * HOUR_MS
const NEW_RELEASE_WINDOW_MS = 7 * DAY_MS
const CATALOG_SIZE = 60

const COLLECTIONS = {
  'kurio-apes': 'Kurio Apes',
  'nomad-club': 'Nomad Club',
  'neon-district': 'Neon District',
  'golden-hours': 'Golden Hours',
  'velvet-archive': 'Velvet Archive',
  'signal-lab': 'Signal Lab',
} as const
type CollectionId = keyof typeof COLLECTIONS

const ART_ALT: Record<ArtworkKey, string> = {
  emerald: 'macaco de pelo marrom com óculos escuros redondos, jaqueta college verde e colar com pingente de esmeralda',
  sage: 'gorila de pelo cinza com chapéu bucket verde-oliva e moletom roxo com capuz',
  ivory: 'macaco de pelo preto com blazer bege sobre blusa de gola alta verde-escura',
  golden: 'macaco de pelo dourado com fones de ouvido verdes e jaqueta clara',
}

const ART_ATTRIBUTES: Record<ArtworkKey, readonly string[]> = {
  emerald: ['Óculos', 'Esmeralda', 'Jaqueta college', 'Colar'],
  sage: ['Chapéu bucket', 'Moletom', 'Sereno', 'Pelagem cinza'],
  ivory: ['Blazer', 'Gola alta', 'Elegante', 'Brinco'],
  golden: ['Fones', 'Dourado', 'Ritmo', 'Jaqueta clara'],
}

const ART_COLLECTIONS: Record<ArtworkKey, readonly CollectionId[]> = {
  emerald: ['kurio-apes', 'velvet-archive'],
  sage: ['nomad-club', 'velvet-archive'],
  ivory: ['neon-district', 'signal-lab'],
  golden: ['golden-hours', 'signal-lab'],
}

const CREATORS = ['Nova Sato', 'Lia Moreno', 'Theo Vance', 'Kai Okafor', 'Mara Quell', 'Rui Tanaka', 'Iris Duval', 'Zé Andrade']

const ADJECTIVES = [
  'Amber', 'Cobalt', 'Crimson', 'Velvet', 'Lunar', 'Solar', 'Copper', 'Onyx', 'Jade', 'Saffron', 'Midnight',
  'Electric', 'Silent', 'Wild', 'Hollow', 'Bright', 'Dusty', 'Royal', 'Atomic', 'Echo', 'Frost', 'Ember',
  'Rogue', 'Polar', 'Mossy', 'Cinder', 'Opal', 'Indigo', 'Marble', 'Static',
]
const NOUNS = [
  'Drifter', 'Monarch', 'Pilot', 'Oracle', 'Ranger', 'Voyager', 'Rebel', 'Scholar', 'Ronin', 'Maestro',
  'Sentinel', 'Dreamer', 'Herald', 'Wanderer', 'Captain', 'Prophet', 'Rider', 'Keeper', 'Bard', 'Courier',
  'Nomad', 'Baron', 'Signal', 'Vessel', 'Bloom', 'Beat',
]

/** [feminino, masculino]: "obra finalizada" e "colecionável finalizado". */
const FINISHES = [
  ['finalizada à mão', 'finalizado à mão'],
  ['pintada digitalmente', 'pintado digitalmente'],
  ['composta em camadas', 'composto em camadas'],
  ['modelada quadro a quadro', 'modelado quadro a quadro'],
] as const
const PERKS = [
  'arte desbloqueável e acesso para colecionadores',
  'arquivo em alta resolução e convite para lançamentos da comunidade',
  'trilha exclusiva e passe para eventos virtuais',
  'versão animada desbloqueável e acesso antecipado a drops',
]
const THEMES = [
  'A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.',
  'A peça investiga memória, ritmo e textura em uma paleta quente e contida.',
  'A composição brinca com contraste, silêncio e cor para contar uma história em um só quadro.',
  'A série revisita retratos clássicos com a linguagem dos games e da cultura de internet.',
]

type EditionKind = '1/1' | '1/10' | '1/50' | 'ABERTA'
const EDITION_TEMPLATES: readonly (readonly EditionKind[])[] = [
  ['1/1', '1/10', '1/50', 'ABERTA'],
  ['1/10', '1/50'],
  ['1/1'],
  ['ABERTA'],
  ['1/10'],
  ['1/1', '1/10', '1/50'],
]
const EDITION_SUPPLY: Record<EditionKind, number | null> = { '1/1': 1, '1/10': 10, '1/50': 50, ABERTA: null }
/** Peso relativo de preço entre edições; a edição de menor peso do NFT custa exatamente o preço base. */
const EDITION_PRICE_WEIGHT: Record<EditionKind, number> = { '1/1': 3.2, '1/10': 1.6, '1/50': 1, ABERTA: 1 }

const centsToEth = (cents: number) => `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const editionSlug = (kind: EditionKind) => (kind === 'ABERTA' ? 'aberta' : kind.replace('/', '-'))
const contractAddress = (id: string) => `0x${stableHash(`contract:${id}`, 5).toUpperCase()}`
const tokenIdOf = (num: number) => `#${String(num).padStart(4, '0')}`

interface HeadEntry {
  name: string
  num: number
  artwork: ArtworkKey
  collection: CollectionId
  category: Category
  network: Network
  priceCents: number
  previousCents?: number
  rarity?: 'raro'
  featured?: boolean
}

/** Os oito primeiros da ordenação "recentes" reproduzem a grade do Figma. */
const FIGMA_GRID: readonly HeadEntry[] = [
  { name: 'Emerald Ape', num: 42, artwork: 'emerald', collection: 'kurio-apes', category: 'arte-digital', network: 'ethereum', priceCents: 119 },
  { name: 'Sage Nomad', num: 9, artwork: 'sage', collection: 'nomad-club', category: 'colecionaveis', network: 'polygon', priceCents: 169 },
  { name: 'Neon Vessel', num: 552, artwork: 'ivory', collection: 'neon-district', category: 'arte-3d', network: 'ethereum', priceCents: 199, previousCents: 229, rarity: 'raro', featured: true },
  { name: 'Cosmic Bloom', num: 118, artwork: 'sage', collection: 'kurio-apes', category: 'generativa', network: 'solana', priceCents: 129 },
  { name: 'Violet Nomad', num: 314, artwork: 'sage', collection: 'kurio-apes', category: 'arte-digital', network: 'ethereum', priceCents: 139 },
  { name: 'Ivory Baron', num: 88, artwork: 'ivory', collection: 'kurio-apes', category: 'colecionaveis', network: 'polygon', priceCents: 179 },
  { name: 'Golden Beat', num: 207, artwork: 'golden', collection: 'kurio-apes', category: 'musica', network: 'ethereum', priceCents: 99 },
  { name: 'Golden Signal', num: 160, artwork: 'golden', collection: 'kurio-apes', category: 'musica', network: 'solana', priceCents: 39 },
]

function buildEditions(nftId: string, kinds: readonly EditionKind[], baseCents: number, prng: Prng, soldOut: boolean) {
  const minWeight = Math.min(...kinds.map((kind) => EDITION_PRICE_WEIGHT[kind]))
  return kinds.map<Edition>((kind) => {
    const supply = EDITION_SUPPLY[kind]
    const available = soldOut ? 0 : kind === '1/1' ? 1 : kind === 'ABERTA' ? prng.int(80, 400) : prng.int(1, supply ?? 1)
    return {
      id: `${nftId}--${editionSlug(kind)}`,
      label: kind,
      supply,
      available,
      priceEth: centsToEth(Math.round((baseCents * EDITION_PRICE_WEIGHT[kind]) / minWeight)),
    }
  })
}

function describe(input: {
  name: string
  collectionName: string
  network: Network
  creator: string
  royalties: number
  editionLabel: string
  prng: Prng
}) {
  const { name, collectionName, network, creator, royalties, editionLabel, prng } = input
  const [finish, finishMasculine] = prng.pick(FINISHES)
  const networkLabel = NETWORK_LABEL[network]
  const description = `Um colecionável digital ${finishMasculine} da coleção ${collectionName}, verificado na ${networkLabel}, com ${prng.pick(PERKS)}.`
  const longDescription = [
    `${name} é uma obra digital ${editionLabel} ${finish} da coleção ${collectionName}. Cada atributo fica armazenado nos metadados do token e verificado na ${networkLabel}. ${prng.pick(THEMES)}`,
    `A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. ${creator} recebe ${royalties}% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.`,
  ]
  return { description, longDescription }
}

function emeraldApe(listedAt: string): NftRecord {
  const id = 'emerald-ape-042'
  return {
    id,
    name: 'Emerald Ape #042',
    tokenId: '#0042',
    artwork: 'emerald',
    imageAlt: `Emerald Ape #042: ${ART_ALT.emerald}`,
    collection: { id: 'kurio-apes', name: COLLECTIONS['kurio-apes'] },
    category: 'arte-digital',
    network: 'ethereum',
    previousPriceEth: null,
    rarity: 'comum',
    isNewRelease: true,
    listedAt,
    popularity: 96,
    version: 1,
    description:
      'Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores.',
    longDescription: [
      'Emerald Ape #042 é uma obra digital 1/50 finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na Ethereum. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.',
      'A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.',
    ],
    attributes: ['Óculos', 'Esmeralda', 'Raro'],
    editions: [
      { id: `${id}--1-1`, label: '1/1', supply: 1, available: 1, priceEth: '5.90' },
      { id: `${id}--1-10`, label: '1/10', supply: 10, available: 4, priceEth: '2.49' },
      { id: `${id}--1-50`, label: '1/50', supply: 50, available: 12, priceEth: '1.19' },
      // Edição aberta já encerrada: serve de exemplo de edição indisponível no detalhe.
      { id: `${id}--aberta`, label: 'ABERTA', supply: null, available: 0, priceEth: '0.89' },
    ],
    defaultEditionId: `${id}--1-50`,
    rating: { average: 4.8, count: 19 },
    contract: { address: '0x7A42C3D19B0E6F2A84D5C7B1E9F03A6D2C8B19E8', standard: 'ERC-721', royaltiesPercent: 5 },
    creator: 'Nova Sato',
    featured: false,
  }
}

interface BuildInput {
  name: string
  num: number
  artwork: ArtworkKey
  collection: CollectionId
  category: Category
  network: Network
  baseCents: number
  previousCents: number | null
  rarity: 'comum' | 'raro'
  featured: boolean
  kinds: readonly EditionKind[]
  soldOut: boolean
  index: number
  prng: Prng
}

function buildNft(input: BuildInput): NftRecord {
  const { name, num, artwork, collection, prng, index } = input
  const fullName = `${name} #${String(num).padStart(3, '0')}`
  const id = slug(fullName)
  const editions = buildEditions(id, input.kinds, input.baseCents, prng, input.soldOut)
  const defaultEdition = editions.find((e) => e.priceEth === centsToEth(input.baseCents))
  if (!defaultEdition) throw new Error(`NFT sem edições: ${id}`)
  const creator = prng.pick(CREATORS)
  const royalties = prng.pick([5, 7.5, 10])
  const listedAtMs = SEED_BASE_TIME - index * LISTING_STEP_MS
  const attributes = prng.shuffle(ART_ATTRIBUTES[artwork]).slice(0, 2)
  return {
    id,
    name: fullName,
    tokenId: tokenIdOf(num),
    artwork,
    imageAlt: `${fullName}: ${ART_ALT[artwork]}`,
    collection: { id: collection, name: COLLECTIONS[collection] },
    category: input.category,
    network: input.network,
    previousPriceEth: input.previousCents === null ? null : centsToEth(input.previousCents),
    rarity: input.rarity,
    isNewRelease: SEED_BASE_TIME - listedAtMs <= NEW_RELEASE_WINDOW_MS,
    listedAt: isoAt(listedAtMs),
    popularity: prng.int(8, 99),
    version: 1,
    ...describe({
      name: fullName,
      collectionName: COLLECTIONS[collection],
      network: input.network,
      creator,
      royalties,
      editionLabel: defaultEdition.label === 'ABERTA' ? 'de edição aberta' : defaultEdition.label,
      prng,
    }),
    attributes: [...attributes, input.rarity === 'raro' ? 'Raro' : 'Comum'],
    editions,
    defaultEditionId: defaultEdition.id,
    rating: { average: prng.int(38, 50) / 10, count: prng.int(2, 64) },
    contract: { address: contractAddress(id), standard: 'ERC-721', royaltiesPercent: royalties },
    creator,
    featured: input.featured,
  }
}

function uniqueNames(prng: Prng, count: number, taken: Set<string>) {
  const result: { name: string; num: number }[] = []
  const usedNums = new Set(FIGMA_GRID.map((e) => e.num))
  while (result.length < count) {
    const name = `${prng.pick(ADJECTIVES)} ${prng.pick(NOUNS)}`
    if (taken.has(name)) continue
    let num = prng.int(1, 999)
    while (usedNums.has(num)) num = prng.int(1, 999)
    taken.add(name)
    usedNums.add(num)
    result.push({ name, num })
  }
  return result
}

/** Distribui as categorias em rodadas embaralhadas para que todas tenham itens suficientes nos filtros. */
function categoryRounds(prng: Prng, count: number) {
  const all = categorySchema.options
  const result: Category[] = []
  while (result.length < count) {
    const round = prng.shuffle(all)
    result.push(...round)
  }
  return result.slice(0, count)
}

/** Preços nos extremos da faixa do Figma (0,02 a 12,30 ETH) ficam garantidos em posições fixas. */
const FIXED_PRICE_CENTS: Record<number, number> = { 21: 1230, 34: 2, 47: 845 }
const SOLD_OUT_INDEXES = new Set([12, 19, 28, 41, 53])

export function seedCatalog(): NftRecord[] {
  const prng = createPrng(0x6b75726f)
  const head = FIGMA_GRID.map((entry, index) =>
    index === 0
      ? emeraldApe(isoAt(SEED_BASE_TIME))
      : buildNft({
          ...entry,
          baseCents: entry.priceCents,
          previousCents: entry.previousCents ?? null,
          rarity: entry.rarity ?? 'comum',
          featured: entry.featured ?? false,
          kinds: ['1/1', '1/10', '1/50'],
          soldOut: false,
          index,
          prng,
        }),
  )

  const generatedCount = CATALOG_SIZE - head.length
  const names = uniqueNames(prng, generatedCount, new Set(FIGMA_GRID.map((e) => e.name)))
  const categories = categoryRounds(prng, generatedCount)
  const generated = names.map(({ name, num }, offset) => {
    const index = head.length + offset
    const artwork = prng.pick<ArtworkKey>(['emerald', 'sage', 'ivory', 'golden'])
    const baseCents = FIXED_PRICE_CENTS[index] ?? Math.round(3 + 1100 * prng.next() ** 2.4)
    const kinds = prng.pick(EDITION_TEMPLATES)
    const soldOut = SOLD_OUT_INDEXES.has(index)
    const hasDiscount = !soldOut && prng.chance(0.18)
    return buildNft({
      name,
      num,
      artwork,
      collection: prng.pick(ART_COLLECTIONS[artwork]),
      category: categories[offset] ?? 'arte-digital',
      network: prng.pick<Network>(['ethereum', 'ethereum', 'ethereum', 'polygon', 'polygon', 'solana']),
      baseCents,
      previousCents: hasDiscount ? Math.round(baseCents * 1.15) + 1 : null,
      rarity: kinds.length === 1 && kinds[0] === '1/1' ? 'raro' : prng.chance(0.15) ? 'raro' : 'comum',
      featured: false,
      kinds,
      soldOut,
      index,
      prng,
    })
  })
  return [...head, ...generated]
}
