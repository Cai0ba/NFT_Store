import type { DbState, SeedKind } from '../schema'
import { seedCatalog } from './catalog'
import { SEED_FAVORITES, seedUsers, seedWallets } from './users'

export async function createSeed(kind: SeedKind): Promise<DbState> {
  const nfts = kind === 'empty-catalog' ? [] : seedCatalog()
  const nftIds = new Set(nfts.map((n) => n.id))
  const favorites = Object.fromEntries(
    Object.entries(SEED_FAVORITES).map(([userId, ids]) => [userId, ids.filter((id) => nftIds.has(id))]),
  )
  return {
    schemaVersion: 1,
    seedKind: kind,
    seq: 0,
    nfts,
    users: await seedUsers(),
    sessions: [],
    favorites,
    carts: [],
    wallets: seedWallets(),
    connections: [],
    orders: [],
    idempotency: [],
    flags: { checkoutTwistUsed: false, walletRejectionUsed: false },
  }
}
