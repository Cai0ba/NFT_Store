import { z } from 'zod'
import { createId } from '@/shared/lib/ids'
import { readStorage, removeStorage, writeStorage } from '@/shared/lib/storage'

/**
 * O carrinho do visitante vive no servidor; o cliente guarda só o identificador, enviado em X-Cart-Id.
 * Depois do merge no login o id é descartado, então um logout começa com um carrinho novo.
 */
const GUEST_CART_STORAGE = 'guestCartId'

export function getGuestCartId(): string | null {
  return readStorage('local', GUEST_CART_STORAGE, z.string().min(1))
}

export function getOrCreateGuestCartId(): string {
  const current = getGuestCartId()
  if (current) return current
  const id = createId()
  writeStorage('local', GUEST_CART_STORAGE, id)
  return id
}

export function discardGuestCartId() {
  removeStorage('local', GUEST_CART_STORAGE)
}
