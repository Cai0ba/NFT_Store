import type { CatalogQuery, Network } from '@/shared/contracts'

/**
 * Fábrica única de chaves. Dados públicos são chaveados pelos parâmetros; dados privados carregam o
 * dono na chave (`userId` ou `guest:<cartId>`), então trocar de usuário nunca reaproveita cache alheio.
 */
export type CartOwnerKey = `guest:${string}` | `user:${string}`

export const queryKeys = {
  catalog: {
    all: ['catalog'] as const,
    list: (query: CatalogQuery) => ['catalog', query] as const,
  },
  nft: {
    all: ['nft'] as const,
    detail: (id: string) => ['nft', id] as const,
  },
  me: {
    all: ['me'] as const,
    user: (userId: string) => ['me', userId] as const,
    favorites: (userId: string) => ['me', userId, 'favorites'] as const,
    profile: (userId: string) => ['me', userId, 'profile'] as const,
    wallets: (userId: string) => ['me', userId, 'wallets'] as const,
  },
  cart: {
    all: ['cart'] as const,
    detail: (owner: CartOwnerKey) => ['cart', owner] as const,
    quotes: (owner: CartOwnerKey) => ['cart', owner, 'quote'] as const,
    quote: (owner: CartOwnerKey, network: Network) => ['cart', owner, 'quote', network] as const,
  },
  order: {
    all: ['order'] as const,
    detail: (id: string) => ['order', id] as const,
  },
} as const

/** Raízes removidas do cache em logout, expiração e troca de usuário. */
export const PRIVATE_QUERY_ROOTS = [queryKeys.me.all, queryKeys.cart.all, queryKeys.order.all] as const

export const mutationKeys = {
  favorites: (userId: string) => ['favorites', userId] as const,
  createOrder: ['orders', 'create'] as const,
}
