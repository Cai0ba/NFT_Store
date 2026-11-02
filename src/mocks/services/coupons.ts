import type { EthAmount } from '@/shared/contracts'
import { compareEth, percentOfEth } from '@/shared/lib/money'
import { MockApiError } from './errors'

interface ActiveCoupon {
  status: 'active'
  description: string
  discount(subtotal: EthAmount): EthAmount
}
type Coupon = ActiveCoupon | { status: 'expired' }

const GENESIS_DISCOUNT = '0.05'

const COUPONS: Record<string, Coupon> = {
  KURIO10: { status: 'active', description: '10% de desconto no subtotal', discount: (subtotal) => percentOfEth(subtotal, 10) },
  GENESIS: {
    status: 'active',
    description: '0,05 ETH de desconto',
    discount: (subtotal) => (compareEth(subtotal, GENESIS_DISCOUNT) < 0 ? subtotal : GENESIS_DISCOUNT),
  },
  LANCAMENTO: { status: 'expired' },
}

export const normalizeCouponCode = (code: string) => code.trim().toUpperCase()

export function requireActiveCoupon(rawCode: string) {
  const code = normalizeCouponCode(rawCode)
  const coupon = COUPONS[code]
  if (!coupon) {
    throw new MockApiError(422, 'COUPON_INVALID', 'Cupom inválido.', { fieldErrors: { code: 'Cupom inválido' } })
  }
  if (coupon.status === 'expired') {
    throw new MockApiError(422, 'COUPON_EXPIRED', 'Este cupom expirou.', { fieldErrors: { code: 'Este cupom expirou' } })
  }
  return { code, coupon }
}

export function activeCoupon(code: string | null): ActiveCoupon | null {
  if (!code) return null
  const coupon = COUPONS[normalizeCouponCode(code)]
  return coupon?.status === 'active' ? coupon : null
}
