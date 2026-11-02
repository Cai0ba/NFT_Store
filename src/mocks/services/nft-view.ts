import type { Edition, NftDetail, NftSummary } from '@/shared/contracts'
import { compareEth } from '@/shared/lib/money'
import type { NftRecord } from '../db/schema'

export function defaultEdition(nft: NftRecord): Edition {
  const edition = nft.editions.find((e) => e.id === nft.defaultEditionId) ?? nft.editions[0]
  if (!edition) throw new Error(`NFT sem edições: ${nft.id}`)
  return edition
}

export const isSoldOut = (nft: NftRecord) => nft.editions.every((e) => e.available === 0)

/** Menor preço entre as edições disponíveis; quando tudo esgotou, o preço da edição padrão. */
export function currentPrice(nft: NftRecord) {
  const available = nft.editions.filter((e) => e.available > 0)
  if (available.length === 0) return defaultEdition(nft).priceEth
  return available.reduce((min, e) => (compareEth(e.priceEth, min) < 0 ? e.priceEth : min), available[0]?.priceEth ?? '0')
}

export function toSummary(nft: NftRecord): NftSummary {
  const priceEth = currentPrice(nft)
  const previous = nft.previousPriceEth
  return {
    id: nft.id,
    name: nft.name,
    tokenId: nft.tokenId,
    artwork: nft.artwork,
    imageAlt: nft.imageAlt,
    collection: nft.collection,
    category: nft.category,
    network: nft.network,
    priceEth,
    // Preço riscado só faz sentido enquanto o atual continuar abaixo dele.
    previousPriceEth: previous !== null && compareEth(previous, priceEth) > 0 ? previous : null,
    rarity: nft.rarity,
    isNewRelease: nft.isNewRelease,
    soldOut: isSoldOut(nft),
    listedAt: nft.listedAt,
    popularity: nft.popularity,
    version: nft.version,
  }
}

export function toDetail(nft: NftRecord): NftDetail {
  return {
    ...toSummary(nft),
    description: nft.description,
    longDescription: nft.longDescription,
    attributes: nft.attributes,
    editions: nft.editions,
    defaultEditionId: nft.defaultEditionId,
    rating: nft.rating,
    contract: nft.contract,
    creator: nft.creator,
  }
}
