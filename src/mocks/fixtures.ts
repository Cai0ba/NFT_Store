/** Referências estáveis do seed, compartilhadas com os testes E2E (sem dependências de runtime). */
export const SEED_ACCOUNTS = {
  ana: { id: 'usr_ana', email: 'ana@kurio.test', password: 'Kurio123', username: 'ana.colecionadora' },
  bruno: { id: 'usr_bruno', email: 'bruno@kurio.test', password: 'Kurio123', username: 'bruno.nft' },
} as const

export const SEED_NFTS = {
  emeraldApe: { id: 'emerald-ape-042', defaultEditionId: 'emerald-ape-042--1-50', soldOutEditionId: 'emerald-ape-042--aberta' },
  neonVessel: { id: 'neon-vessel-552' },
  goldenSignal: { id: 'golden-signal-160' },
} as const

export const SEED_WALLETS = {
  anaPrimary: 'wal_ana_primary',
  anaSecondary: 'wal_ana_secondary',
} as const

export const SEED_COUPONS = { percent: 'KURIO10', fixed: 'GENESIS', expired: 'LANCAMENTO' } as const
