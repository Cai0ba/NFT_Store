import type { EthAmount, Network, Quote, QuoteIssue } from '@/shared/contracts'
import { addEth, compareEth, formatEth, isZeroEth, mulEth, subEth } from '@/shared/lib/money'
import type { CartRecord } from '../db/schema'
import { canonicalJson, stableHash } from '../lib/hash'
import { isoAt } from '../lib/text'
import { findNft } from './catalog'
import { activeCoupon } from './coupons'

export const NETWORK_FEE: Record<Network, EthAmount> = {
  ethereum: '0.016',
  polygon: '0.004',
  solana: '0.002',
}

const QUOTE_TTL_MS = 5 * 60 * 1000

interface PricedLine {
  itemId: string
  nftId: string
  editionId: string
  name: string
  requested: number
  quantity: number
  available: number
  unitPriceEth: EthAmount
  addedUnitPriceEth: EthAmount
}

function priceLines(cart: CartRecord): PricedLine[] {
  return cart.items.flatMap((item) => {
    const nft = findNft(item.nftId)
    const edition = nft?.editions.find((e) => e.id === item.editionId)
    if (!nft || !edition) return []
    return [
      {
        itemId: item.id,
        nftId: nft.id,
        editionId: edition.id,
        name: `${nft.name} (${edition.label})`,
        requested: item.quantity,
        quantity: Math.min(item.quantity, edition.available),
        available: edition.available,
        unitPriceEth: edition.priceEth,
        addedUnitPriceEth: item.addedUnitPriceEth,
      },
    ]
  })
}

function issuesOf(line: PricedLine): QuoteIssue[] {
  const issues: QuoteIssue[] = []
  if (line.available === 0) {
    issues.push({ itemId: line.itemId, kind: 'sold-out', available: 0, message: `${line.name} esgotou e não será cobrado.` })
  } else if (line.available < line.requested) {
    issues.push({
      itemId: line.itemId,
      kind: 'quantity-reduced',
      available: line.available,
      message: `Só restam ${line.available} unidade(s) de ${line.name}; a quantidade foi ajustada.`,
    })
  }
  if (compareEth(line.unitPriceEth, line.addedUnitPriceEth) !== 0) {
    issues.push({
      itemId: line.itemId,
      kind: 'price-changed',
      previousPriceEth: line.addedUnitPriceEth,
      currentPriceEth: line.unitPriceEth,
      message: `O preço de ${line.name} mudou de ${formatEth(line.addedUnitPriceEth)} para ${formatEth(line.unitPriceEth)}.`,
    })
  }
  return issues
}

/**
 * Cotação calculada a partir do estado atual do carrinho e do catálogo. O hash cobre exatamente o
 * que afeta a cobrança (preços, quantidades, disponibilidade, cupom e rede), então qualquer
 * mudança relevante entre a revisão e a confirmação invalida a cotação anterior.
 */
export function buildQuote(cart: CartRecord, network: Network): Quote {
  const lines = priceLines(cart)
  const quoteLines = lines.map((line) => ({
    itemId: line.itemId,
    nftId: line.nftId,
    editionId: line.editionId,
    quantity: line.quantity,
    unitPriceEth: line.unitPriceEth,
    lineTotalEth: mulEth(line.unitPriceEth, line.quantity),
  }))
  const subtotalEth = addEth('0', ...quoteLines.map((l) => l.lineTotalEth))
  const coupon = activeCoupon(cart.couponCode)
  const discountEth = coupon && !isZeroEth(subtotalEth) ? coupon.discount(subtotalEth) : '0'
  const hasPurchasable = quoteLines.some((l) => l.quantity > 0)
  const networkFeeEth = hasPurchasable ? NETWORK_FEE[network] : '0'
  const totalEth = addEth(subEth(subtotalEth, discountEth), networkFeeEth)

  const hash = stableHash(
    canonicalJson({
      cartId: cart.id,
      network,
      coupon: coupon ? cart.couponCode : null,
      lines: lines.map(({ itemId, editionId, requested, quantity, available, unitPriceEth }) => ({
        itemId,
        editionId,
        requested,
        quantity,
        available,
        unitPriceEth,
      })),
      discountEth,
      networkFeeEth,
    }),
    4,
  )
  const now = Date.now()
  return {
    id: `qt_${hash.slice(0, 16)}`,
    hash,
    cartId: cart.id,
    cartVersion: cart.version,
    network,
    lines: quoteLines,
    subtotalEth,
    discountEth,
    networkFeeEth,
    totalEth,
    coupon: coupon && cart.couponCode ? { code: cart.couponCode, status: 'applied', description: coupon.description } : null,
    issues: lines.flatMap(issuesOf),
    createdAt: isoAt(now),
    expiresAt: isoAt(now + QUOTE_TTL_MS),
  }
}
