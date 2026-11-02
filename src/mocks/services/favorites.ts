import { db } from '../db/store'
import { requireNft } from './catalog'

export function listFavorites(userId: string) {
  const existing = new Set(db.state.nfts.map((n) => n.id))
  return (db.state.favorites[userId] ?? []).filter((id) => existing.has(id))
}

/** PUT e DELETE são idempotentes: repetir a operação não muda o resultado. */
export function setFavorite(userId: string, nftId: string, favorite: boolean) {
  requireNft(nftId)
  db.mutate((s) => {
    const current = (s.favorites[userId] ?? []).filter((id) => id !== nftId)
    s.favorites[userId] = favorite ? [nftId, ...current] : current
  })
}
