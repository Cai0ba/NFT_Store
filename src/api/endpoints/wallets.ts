import {
  walletConnectionSchema,
  walletsResponseSchema,
  type Network,
  type UpsertWalletRequest,
  type WalletConnection,
  type WalletSlot,
  type WalletsResponse,
} from '@/shared/contracts'
import { http, parseResponse, type RequestOptions } from '../http'

export async function getWallets({ signal }: RequestOptions = {}): Promise<WalletsResponse> {
  const { data } = await http.get('/me/wallets', { signal })
  return parseResponse(walletsResponseSchema, data)
}

export async function upsertWallet(
  slot: WalletSlot,
  body: UpsertWalletRequest,
  { signal }: RequestOptions = {},
): Promise<WalletsResponse> {
  const { data } = await http.put(`/me/wallets/${slot}`, body, { signal })
  return parseResponse(walletsResponseSchema, data)
}

export async function connectWallet(
  walletId: string,
  network: Network,
  { signal }: RequestOptions = {},
): Promise<WalletConnection> {
  const { data } = await http.post(`/me/wallets/${encodeURIComponent(walletId)}/connection`, { network }, { signal })
  return parseResponse(walletConnectionSchema, data)
}

export async function disconnectWallet(walletId: string, { signal }: RequestOptions = {}): Promise<void> {
  await http.delete(`/me/wallets/${encodeURIComponent(walletId)}/connection`, { signal })
}
