import Decimal from 'decimal.js-light'
import type { EthAmount } from '../contracts'

/**
 * Aritmética de ETH com decimal.js-light. Nunca converta para `number` antes de terminar a conta:
 * 0.1 + 0.2 em ponto flutuante já quebraria o resumo do carrinho.
 */
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP })

export const ETH_DECIMALS = 18

export const eth = (value: EthAmount | number | Decimal) => new D(value)

export function toEthString(value: Decimal): EthAmount {
  const fixed = value.toDecimalPlaces(ETH_DECIMALS, D.ROUND_HALF_UP).toFixed(ETH_DECIMALS)
  return fixed.replace(/\.?0+$/, '') || '0'
}

export const addEth = (...values: EthAmount[]): EthAmount =>
  toEthString(values.reduce((acc, v) => acc.plus(v), new D(0)))

export const subEth = (a: EthAmount, b: EthAmount): EthAmount => toEthString(new D(a).minus(b))

export const mulEth = (a: EthAmount, quantity: number): EthAmount => {
  if (!Number.isInteger(quantity)) throw new Error('Quantidade deve ser inteira')
  return toEthString(new D(a).times(quantity))
}

export const percentOfEth = (a: EthAmount, percent: number): EthAmount =>
  toEthString(new D(a).times(percent).dividedBy(100))

export const compareEth = (a: EthAmount, b: EthAmount) => new D(a).comparedTo(b)

export const isZeroEth = (a: EthAmount) => new D(a).isZero()

const maxFractionFor = (value: Decimal) => {
  // Valores pequenos (taxas de rede) precisam de mais casas para não virar "0.00".
  if (value.isZero()) return 2
  if (value.abs().lessThan(0.1)) return 3
  return 2
}

/**
 * Formata para exibição seguindo o Figma ("1.19 ETH", "0.016 ETH", "26.846 ETH").
 * Mantém as casas significativas até `maxDigits` e nunca arredonda para menos que o valor real em centésimos.
 */
export function formatEth(value: EthAmount, options: { suffix?: boolean; maxDigits?: number } = {}) {
  const { suffix = true, maxDigits = 4 } = options
  const d = new D(value)
  const minFraction = maxFractionFor(d)
  let text = d.toDecimalPlaces(maxDigits, D.ROUND_HALF_UP).toFixed(maxDigits)
  const [int, frac = ''] = text.split('.')
  let trimmed = frac.replace(/0+$/, '')
  if (trimmed.length < minFraction) trimmed = trimmed.padEnd(minFraction, '0')
  text = trimmed ? `${int}.${trimmed}` : (int ?? '0')
  return suffix ? `${text} ETH` : text
}

/** Leitura acessível: "1,19 ether" em vez de "1.19 ETH". */
export function formatEthForScreenReader(value: EthAmount) {
  return `${formatEth(value, { suffix: false }).replace('.', ',')} ether`
}

export function formatDiscount(value: EthAmount) {
  return isZeroEth(value) ? '(-) 00.00' : `(-) ${formatEth(value, { suffix: false })}`
}
