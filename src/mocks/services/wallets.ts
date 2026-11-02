import {
  upsertWalletRequestSchema,
  walletConnectionRequestSchema,
  walletInputSchema,
  walletSlotSchema,
  type WalletConnection,
  type WalletInput,
  type WalletsResponse,
  type WalletSlot,
} from '@/shared/contracts'
import { db } from '../db/store'
import type { WalletRecord } from '../db/schema'
import { nowIso } from '../lib/text'
import { runtime } from '../runtime'
import { fail, MockApiError, parseOrFail } from './errors'

type WalletView = Omit<WalletRecord, 'userId'>

const walletIdFor = (userId: string, slot: WalletSlot) => `wal_${userId.replace(/^usr_/, '')}_${slot}`

const rawWallet = (userId: string, slot: WalletSlot) =>
  db.state.wallets.find((w) => w.userId === userId && w.slot === slot) ?? null

/** A secundária marcada como "igual à principal" espelha a principal na leitura, sem cópia defasada. */
function view(record: WalletRecord | null, primary: WalletRecord | null): WalletView | null {
  if (!record) return null
  const { userId: _userId, ...wallet } = record
  if (!record.sameAsPrimary || !primary) return wallet
  const { userId: _primaryUser, id: _id, slot: _slot, sameAsPrimary: _same, updatedAt: _updated, ...fields } = primary
  return { ...wallet, ...fields }
}

export function listWallets(userId: string): WalletsResponse {
  const primary = rawWallet(userId, 'primary')
  return { primary: view(primary, primary), secondary: view(rawWallet(userId, 'secondary'), primary) }
}

export function findUserWallet(userId: string, walletId: string): WalletView | null {
  const wallets = listWallets(userId)
  return [wallets.primary, wallets.secondary].find((w) => w?.id === walletId) ?? null
}

function parseUpsert(body: unknown) {
  const sameAsPrimary = typeof body === 'object' && body !== null && Reflect.get(body, 'sameAsPrimary') === true
  if (sameAsPrimary) return parseOrFail(upsertWalletRequestSchema, body)
  // Validar direto contra o schema dos campos dá mensagens por campo; a união do contrato só diria "inválido".
  return { ...parseOrFail(walletInputSchema, body), sameAsPrimary: false as const }
}

export function upsertWallet(userId: string, rawSlot: string, body: unknown): WalletsResponse {
  const slot = walletSlotSchema.safeParse(rawSlot)
  if (!slot.success) throw fail.notFound('Tipo de carteira inexistente.')
  const input = parseUpsert(body)
  const primary = rawWallet(userId, 'primary')

  if (input.sameAsPrimary) {
    if (slot.data === 'primary') throw fail.validation({ sameAsPrimary: 'Disponível apenas para a carteira secundária' })
    if (!primary) throw fail.conflict('CONFLICT', 'Cadastre a carteira principal antes de usá-la como secundária.')
  }

  const fields: WalletInput = input.sameAsPrimary && primary ? primary : (input as WalletInput)
  db.mutate((s) => {
    s.wallets = s.wallets.filter((w) => !(w.userId === userId && w.slot === slot.data))
    s.wallets.push({
      ...pickInput(fields),
      id: walletIdFor(userId, slot.data),
      userId,
      slot: slot.data,
      sameAsPrimary: input.sameAsPrimary === true,
      updatedAt: nowIso(),
    })
  })
  return listWallets(userId)
}

function pickInput(source: WalletInput): WalletInput {
  return {
    displayName: source.displayName,
    nickname: source.nickname,
    network: source.network,
    profileName: source.profileName,
    address: source.address,
    ensOrSecondary: source.ensOrSecondary ?? '',
    provider: source.provider,
    referralCode: source.referralCode,
    email: source.email,
    ensName: source.ensName,
    ensSuffix: source.ensSuffix,
  }
}

export function connectWallet(userId: string, walletId: string, body: unknown): WalletConnection {
  const { network } = parseOrFail(walletConnectionRequestSchema, body)
  if (!findUserWallet(userId, walletId)) throw fail.notFound('Carteira não encontrada.')
  if (runtime.scenario().walletRejectsOnce && !db.state.flags.walletRejectionUsed) {
    db.mutate((s) => {
      s.flags.walletRejectionUsed = true
    })
    throw new MockApiError(403, 'WALLET_REJECTED', 'A conexão foi recusada na extensão da carteira.')
  }
  const connection: WalletConnection = { walletId, network, status: 'connected', connectedAt: nowIso() }
  db.mutate((s) => {
    s.connections = s.connections.filter((c) => c.userId !== userId)
    s.connections.push({ ...connection, userId })
  })
  return connection
}

export function disconnectWallet(userId: string, walletId: string) {
  db.mutate((s) => {
    s.connections = s.connections.filter((c) => !(c.userId === userId && c.walletId === walletId))
  })
}

export function activeConnection(userId: string) {
  return db.state.connections.find((c) => c.userId === userId) ?? null
}
