import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import * as walletsApi from '@/api/endpoints/wallets'
import { getErrorMessage, hasErrorCode, isApiError, type ApiError } from '@/api/errors'
import { queryKeys } from '@/api/query-keys'
import { STALE_TIME } from '@/app/query-client'
import { useSession } from '@/features/auth/session'
import { sessionStore } from '@/features/auth/session-store'
import {
  NETWORK_LABEL,
  walletConnectionSchema,
  type Network,
  type UpsertWalletRequest,
  type WalletConnection,
  type WalletSlot,
} from '@/shared/contracts'
import { announce } from '@/shared/lib/announcer'
import { readStorage, removeStorage, writeStorage } from '@/shared/lib/storage'

export function walletsQueryOptions(userId: string) {
  return queryOptions({
    queryKey: queryKeys.me.wallets(userId),
    queryFn: ({ signal }) => walletsApi.getWallets({ signal }),
    staleTime: STALE_TIME.private,
    refetchOnWindowFocus: true,
  })
}

export function useWallets() {
  const { user } = useSession()
  return useQuery({ ...walletsQueryOptions(user?.id ?? ''), enabled: Boolean(user) })
}

export function useUpsertWallet(slot: WalletSlot) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UpsertWalletRequest) => walletsApi.upsertWallet(slot, body),
    onMutate: () => ({ userId: sessionStore.getState().user?.id ?? null }),
    onSuccess: (wallets, _body, context) => {
      if (!context.userId || context.userId !== sessionStore.getState().user?.id) return
      queryClient.setQueryData(queryKeys.me.wallets(context.userId), wallets)
      announce(slot === 'primary' ? 'Carteira principal salva.' : 'Carteira secundária salva.')
    },
  })
}

/* ---------- Conexão simulada com a extensão ---------- */

export type WalletConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'rejected'

interface ConnectionState {
  userId: string | null
  connection: WalletConnection | null
  status: WalletConnectionStatus
  error: ApiError | null
  isDisconnecting: boolean
}

// A API não expõe GET da conexão; guardamos a última confirmada na aba para sobreviver ao refresh.
const storageName = (userId: string) => `walletConnection.${userId}`

function initialFor(userId: string | null): ConnectionState {
  const connection = userId ? readStorage('session', storageName(userId), walletConnectionSchema) : null
  return {
    userId,
    connection,
    status: connection ? 'connected' : 'disconnected',
    error: null,
    isDisconnecting: false,
  }
}

let connectionState = initialFor(sessionStore.getState().user?.id ?? null)
const listeners = new Set<() => void>()

function setConnectionState(patch: Partial<ConnectionState>) {
  connectionState = { ...connectionState, ...patch }
  listeners.forEach((listener) => listener())
}

sessionStore.subscribe((next) => {
  const userId = next.user?.id ?? null
  if (userId !== connectionState.userId) {
    connectionState = initialFor(userId)
    listeners.forEach((listener) => listener())
  }
})

/** Usado pelo checkout quando o servidor diz que a carteira não está conectada. */
export function resetWalletConnection() {
  if (connectionState.userId) removeStorage('session', storageName(connectionState.userId))
  setConnectionState({ connection: null, status: 'disconnected', isDisconnecting: false })
}

async function connect(walletId: string, network: Network): Promise<boolean> {
  const { userId, status } = connectionState
  if (!userId || status === 'connecting') return false
  setConnectionState({ status: 'connecting', error: null })
  try {
    const connection = await walletsApi.connectWallet(walletId, network)
    if (connectionState.userId !== userId) return false
    writeStorage('session', storageName(userId), connection)
    setConnectionState({ connection, status: 'connected', error: null })
    announce(`Carteira conectada na rede ${NETWORK_LABEL[network]}.`)
    return true
  } catch (error) {
    if (connectionState.userId !== userId) return false
    const apiError = isApiError(error) ? error : null
    const rejected = hasErrorCode(error, 'WALLET_REJECTED')
    removeStorage('session', storageName(userId))
    setConnectionState({ connection: null, status: rejected ? 'rejected' : 'disconnected', error: apiError })
    announce(getErrorMessage(error), 'assertive')
    return false
  }
}

async function disconnect(): Promise<void> {
  const { userId, connection, isDisconnecting } = connectionState
  if (!userId || !connection || isDisconnecting) return
  setConnectionState({ isDisconnecting: true, error: null })
  try {
    await walletsApi.disconnectWallet(connection.walletId)
    if (connectionState.userId !== userId) return
    removeStorage('session', storageName(userId))
    setConnectionState({ connection: null, status: 'disconnected', isDisconnecting: false })
    announce('Carteira desconectada.')
  } catch (error) {
    if (connectionState.userId !== userId) return
    setConnectionState({ isDisconnecting: false, error: isApiError(error) ? error : null })
    announce(getErrorMessage(error), 'assertive')
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useWalletConnection(): {
  connection: WalletConnection | null
  status: WalletConnectionStatus
  error: ApiError | null
  isDisconnecting: boolean
  connect(walletId: string, network: Network): Promise<boolean>
  disconnect(): Promise<void>
} {
  const state = useSyncExternalStore(
    subscribe,
    () => connectionState,
    () => connectionState,
  )
  return {
    connection: state.connection,
    status: state.status,
    error: state.error,
    isDisconnecting: state.isDisconnecting,
    connect,
    disconnect,
  }
}
