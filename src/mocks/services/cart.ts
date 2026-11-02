import { z } from 'zod'
import {
  CART_ID_HEADER,
  type AddCartItemRequest,
  type Cart,
  type CartItem,
  type Edition,
} from '@/shared/contracts'
import { mulEth } from '@/shared/lib/money'
import { db } from '../db/store'
import type { CartRecord, NftRecord } from '../db/schema'
import { nowIso } from '../lib/text'
import type { AuthContext } from './auth'
import { findNft, requireNft } from './catalog'
import { requireActiveCoupon } from './coupons'
import { fail, MockApiError } from './errors'

const guestCartIdSchema = z.string().trim().min(8).max(64).regex(/^[\w-]+$/)

export const userCartId = (userId: string) => `cart_${userId}`

function createCart(id: string, userId: string | null): CartRecord {
  const cart: CartRecord = {
    id,
    ownerType: userId ? 'user' : 'guest',
    userId,
    items: [],
    couponCode: null,
    version: 1,
    updatedAt: nowIso(),
  }
  db.mutate((s) => s.carts.push(cart))
  return cart
}

export function findCart(id: string) {
  return db.state.carts.find((c) => c.id === id) ?? null
}

export function userCart(userId: string) {
  return findCart(userCartId(userId)) ?? createCart(userCartId(userId), userId)
}

/** Usuário autenticado usa o carrinho da conta; visitante, o do header X-Cart-Id (criado se não existir). */
export function resolveCart(request: Request, auth: AuthContext | null) {
  if (auth) return userCart(auth.user.id)
  const parsed = guestCartIdSchema.safeParse(request.headers.get(CART_ID_HEADER))
  if (parsed.success) {
    const cart = findCart(parsed.data)
    if (!cart) return createCart(parsed.data, null)
    if (cart.ownerType === 'guest') return cart
  }
  // Sem header válido (ou tentando usar o id de um carrinho de conta) o visitante ganha um carrinho novo.
  return createCart(crypto.randomUUID(), null)
}

function lookup(nftId: string, editionId: string): { nft: NftRecord; edition: Edition } | null {
  const nft = findNft(nftId)
  const edition = nft?.editions.find((e) => e.id === editionId)
  return nft && edition ? { nft, edition } : null
}

function toCartItem(item: CartRecord['items'][number]): CartItem | null {
  const found = lookup(item.nftId, item.editionId)
  if (!found) return null
  const { nft, edition } = found
  return {
    id: item.id,
    nftId: nft.id,
    editionId: edition.id,
    editionLabel: edition.label,
    name: nft.name,
    tokenId: nft.tokenId,
    artwork: nft.artwork,
    quantity: item.quantity,
    unitPriceEth: edition.priceEth,
    addedUnitPriceEth: item.addedUnitPriceEth,
    available: edition.available,
    lineTotalEth: mulEth(edition.priceEth, item.quantity),
  }
}

export function toCartDto(cart: CartRecord): Cart {
  return {
    id: cart.id,
    ownerType: cart.ownerType,
    items: cart.items.map(toCartItem).filter((item): item is CartItem => item !== null),
    couponCode: cart.couponCode,
    version: cart.version,
    updatedAt: cart.updatedAt,
  }
}

function touch(cart: CartRecord) {
  cart.version += 1
  cart.updatedAt = nowIso()
}

function availabilityConflict(available: number, inCart: number) {
  const message =
    available === 0
      ? 'Esta edição esgotou.'
      : `Só ${available === 1 ? 'resta 1 unidade disponível' : `restam ${available} unidades disponíveis`} desta edição.`
  return fail.conflict('AVAILABILITY_CONFLICT', message, { details: { available, inCart } })
}

export function addItem(cart: CartRecord, input: AddCartItemRequest) {
  const nft = requireNft(input.nftId)
  const edition = nft.editions.find((e) => e.id === input.editionId)
  if (!edition) throw fail.notFound('Edição não encontrada.')
  if (edition.available === 0) throw new MockApiError(409, 'EDITION_UNAVAILABLE', 'Esta edição está esgotada.')
  const existing = cart.items.find((i) => i.editionId === edition.id)
  const inCart = existing?.quantity ?? 0
  if (inCart + input.quantity > edition.available) throw availabilityConflict(edition.available, inCart)

  db.mutate(() => {
    if (existing) {
      existing.quantity += input.quantity
      existing.addedUnitPriceEth = edition.priceEth
    } else {
      cart.items.push({
        id: db.nextId('ci'),
        nftId: nft.id,
        editionId: edition.id,
        quantity: input.quantity,
        addedUnitPriceEth: edition.priceEth,
        addedAt: nowIso(),
      })
    }
    touch(cart)
  })
  return cart
}

function requireItem(cart: CartRecord, itemId: string) {
  const item = cart.items.find((i) => i.id === itemId)
  if (!item) throw fail.notFound('Item não encontrado no carrinho.')
  return item
}

/** Alterar a quantidade também confirma o preço vigente: é assim que o cliente aceita uma mudança de preço. */
export function updateItem(cart: CartRecord, itemId: string, quantity: number) {
  const item = requireItem(cart, itemId)
  const found = lookup(item.nftId, item.editionId)
  if (!found) throw fail.notFound('Este NFT não está mais disponível.')
  if (quantity > found.edition.available) throw availabilityConflict(found.edition.available, item.quantity)
  db.mutate(() => {
    item.quantity = quantity
    item.addedUnitPriceEth = found.edition.priceEth
    touch(cart)
  })
  return cart
}

export function removeItem(cart: CartRecord, itemId: string) {
  requireItem(cart, itemId)
  db.mutate(() => {
    cart.items = cart.items.filter((i) => i.id !== itemId)
    touch(cart)
  })
  return cart
}

export function applyCoupon(cart: CartRecord, rawCode: string) {
  const { code } = requireActiveCoupon(rawCode)
  db.mutate(() => {
    cart.couponCode = code
    touch(cart)
  })
  return cart
}

export function removeCoupon(cart: CartRecord) {
  if (cart.couponCode === null) return cart
  db.mutate(() => {
    cart.couponCode = null
    touch(cart)
  })
  return cart
}

/** Soma as quantidades do visitante às da conta sem ultrapassar a disponibilidade de cada edição. */
export function mergeGuestCart(userId: string, guestCartId: string) {
  const target = userCart(userId)
  const guest = findCart(guestCartId)
  if (!guest || guest.ownerType !== 'guest') return target
  db.mutate((s) => {
    for (const guestItem of guest.items) {
      const found = lookup(guestItem.nftId, guestItem.editionId)
      if (!found) continue
      const existing = target.items.find((i) => i.editionId === guestItem.editionId)
      const desired = (existing?.quantity ?? 0) + guestItem.quantity
      const quantity = found.edition.available > 0 ? Math.min(desired, found.edition.available) : desired
      if (existing) existing.quantity = Math.max(existing.quantity, quantity)
      else target.items.push({ ...guestItem, id: db.nextId('ci'), quantity })
    }
    target.couponCode ??= guest.couponCode
    s.carts = s.carts.filter((c) => c.id !== guest.id)
    touch(target)
  })
  return target
}

/** Após a confirmação do pedido sai do carrinho só o que foi comprado; o restante permanece. */
export function removePurchased(userId: string, purchased: { editionId: string; quantity: number }[]) {
  const cart = findCart(userCartId(userId))
  if (!cart) return
  db.mutate(() => {
    for (const line of purchased) {
      const item = cart.items.find((i) => i.editionId === line.editionId)
      if (item) item.quantity -= line.quantity
    }
    cart.items = cart.items.filter((i) => i.quantity > 0)
    touch(cart)
  })
}
