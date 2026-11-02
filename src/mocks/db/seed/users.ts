import { SEED_ACCOUNTS, SEED_NFTS, SEED_WALLETS } from '../../fixtures'
import { hashPassword } from '../../lib/password'
import { stableHash } from '../../lib/hash'
import { isoAt } from '../../lib/text'
import type { UserRecord, WalletRecord } from '../schema'
import { DAY_MS, SEED_BASE_TIME } from './constants'

const SEED_PASSWORD = SEED_ACCOUNTS.ana.password
const ANA_ID = SEED_ACCOUNTS.ana.id
const BRUNO_ID = SEED_ACCOUNTS.bruno.id

const createdAt = isoAt(SEED_BASE_TIME - 120 * DAY_MS)
const updatedAt = isoAt(SEED_BASE_TIME - 2 * DAY_MS)

/** Sal fixo por usuário para que o seed seja idêntico a cada reset; contas novas usam sal aleatório. */
async function credentials(userId: string) {
  const passwordSalt = stableHash(`salt:${userId}`, 4)
  return { passwordSalt, passwordHash: await hashPassword(SEED_PASSWORD, passwordSalt) }
}

export async function seedUsers(): Promise<UserRecord[]> {
  return [
    {
      id: ANA_ID,
      username: SEED_ACCOUNTS.ana.username,
      email: SEED_ACCOUNTS.ana.email,
      displayName: 'Ana Colecionadora',
      avatarUrl: null,
      walletNickname: 'Ana Principal',
      ensName: 'ana-kurio',
      ensSuffix: '.eth',
      createdAt,
      updatedAt,
      ...(await credentials(ANA_ID)),
    },
    {
      id: BRUNO_ID,
      username: SEED_ACCOUNTS.bruno.username,
      email: SEED_ACCOUNTS.bruno.email,
      displayName: 'Bruno Lima',
      avatarUrl: null,
      walletNickname: 'Bruno',
      ensName: '',
      ensSuffix: '.eth',
      createdAt,
      updatedAt,
      ...(await credentials(BRUNO_ID)),
    },
  ]
}

export function seedWallets(): WalletRecord[] {
  return [
    {
      id: SEED_WALLETS.anaPrimary,
      userId: ANA_ID,
      slot: 'primary',
      sameAsPrimary: false,
      displayName: 'Ana Colecionadora',
      nickname: 'Principal',
      network: 'ethereum',
      profileName: 'ana.colecionadora',
      address: '0xA91F3b7C2d4E5f60718293A4b5C6d7E8f901E82C',
      ensOrSecondary: '',
      provider: 'metamask',
      referralCode: 'KURIO26',
      email: 'ana@kurio.test',
      ensName: 'ana-kurio',
      ensSuffix: '.eth',
      updatedAt,
    },
    {
      id: SEED_WALLETS.anaSecondary,
      userId: ANA_ID,
      slot: 'secondary',
      sameAsPrimary: false,
      displayName: 'Ana Colecionadora',
      nickname: 'Reserva',
      network: 'polygon',
      profileName: 'ana.reserva',
      address: '0x5C3B8e21D9a7F4c60B1e2D3f4A5b6C7d8E9f0A12',
      ensOrSecondary: 'nova.kurio.eth',
      provider: 'walletconnect',
      referralCode: 'KURIO26',
      email: 'ana@kurio.test',
      ensName: 'nova',
      ensSuffix: '.eth',
      updatedAt,
    },
  ]
}

export const SEED_FAVORITES: Record<string, string[]> = {
  [ANA_ID]: [SEED_NFTS.emeraldApe.id, SEED_NFTS.neonVessel.id, SEED_NFTS.goldenSignal.id],
  [BRUNO_ID]: [],
}
