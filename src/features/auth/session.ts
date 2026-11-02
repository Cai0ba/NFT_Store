import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import * as authApi from '@/api/endpoints/auth'
import { mergeGuestCart } from '@/api/endpoints/cart'
import { hasErrorCode } from '@/api/errors'
import { queryKeys } from '@/api/query-keys'
import { discardGuestCartId, getGuestCartId } from '@/features/cart/guest-cart'
import type { LoginRequest, RegisterRequest, Session, User } from '@/shared/contracts'
import {
  acknowledgeExpiry,
  clearSession,
  confirmSession,
  establishSession,
  expireSession,
  EXPIRY_REASON,
  sessionStore,
  type SessionState,
  type SessionStatus,
} from './session-store'

export type { SessionState, SessionStatus } from './session-store'

export interface AuthController {
  getState(): SessionState
  whenReady(): Promise<SessionState>
}

/** Exposto no contexto do router para os guards lerem a sessão sem depender de hooks. */
export const authController: AuthController = {
  getState: sessionStore.getState,
  whenReady: sessionStore.whenReady,
}

function useSessionState(): SessionState {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.getState, sessionStore.getState)
}

export function useSession(): { status: SessionStatus; user: User | null } {
  const { status, user } = useSessionState()
  return { status, user: status === 'authenticated' ? user : null }
}

export function useSessionExpiry(): {
  expired: boolean
  reason: string | null
  resumeHref: string | null
  acknowledge(): void
} {
  const { expiry } = useSessionState()
  return {
    expired: expiry !== null,
    reason: expiry?.reason ?? null,
    resumeHref: expiry?.resumeHref ?? null,
    acknowledge: acknowledgeExpiry,
  }
}

/**
 * Leva o carrinho de visitante para a conta. Se falhar, o id fica guardado e o merge é tentado de
 * novo no próximo boot autenticado, para os itens não se perderem.
 */
export async function mergePendingGuestCart(queryClient: QueryClient) {
  const guestCartId = getGuestCartId()
  const { user } = sessionStore.getState()
  if (!guestCartId || !user) return
  try {
    const cart = await mergeGuestCart(guestCartId)
    discardGuestCartId()
    queryClient.setQueryData(queryKeys.cart.detail(`user:${user.id}`), cart)
    void queryClient.invalidateQueries({ queryKey: queryKeys.cart.quotes(`user:${user.id}`) })
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[auth] merge do carrinho de visitante falhou', error)
  }
}

async function startSession(session: Session, queryClient: QueryClient) {
  establishSession(session)
  await mergePendingGuestCart(queryClient)
  return session
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: LoginRequest) => startSession(await authApi.login(body), queryClient),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: RegisterRequest) => startSession(await authApi.register(body), queryClient),
  })
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout()
      } finally {
        // Mesmo sem resposta do servidor, a sessão local precisa acabar: o usuário pediu para sair.
        clearSession()
      }
    },
  })
}

const SESSION_CHECK_GRACE_MS = 1_000
const MAX_TIMER_MS = 2 ** 31 - 1
let expiryTimer: ReturnType<typeof setTimeout> | undefined

/**
 * Valida o token salvo no boot e agenda uma nova checagem para quando a sessão vencer. Quem decide se
 * ela venceu é sempre o servidor; o relógio local só escolhe o momento de perguntar.
 */
export async function initSession(queryClient: QueryClient) {
  sessionStore.subscribe((next, prev) => {
    if (next.token !== prev.token || next.expiresAt !== prev.expiresAt) scheduleExpiryCheck(next)
  })

  const { status, token, user, expiresAt } = sessionStore.getState()
  if (status !== 'loading' || !token) return

  try {
    const result = await authApi.getSession()
    confirmSession(result.user, result.expiresAt)
    void mergePendingGuestCart(queryClient)
  } catch (error) {
    if (hasErrorCode(error, 'SESSION_EXPIRED')) {
      expireSession(EXPIRY_REASON.expired)
    } else if (hasErrorCode(error, 'UNAUTHENTICATED')) {
      clearSession()
    } else if (user && expiresAt) {
      // Falha transitória: segue com o usuário salvo. Se o token não valer, o próximo 401 encerra a sessão.
      confirmSession(user, expiresAt)
    } else {
      clearSession()
    }
  } finally {
    scheduleExpiryCheck(sessionStore.getState())
  }
}

function scheduleExpiryCheck(state: SessionState) {
  clearTimeout(expiryTimer)
  if (!state.token || !state.expiresAt) return
  const delay = Math.min(Math.max(Date.parse(state.expiresAt) - Date.now() + SESSION_CHECK_GRACE_MS, 0), MAX_TIMER_MS)
  const token = state.token
  expiryTimer = setTimeout(() => {
    void checkSessionStillValid(token)
  }, delay)
}

async function checkSessionStillValid(token: string) {
  if (sessionStore.getState().token !== token) return
  try {
    const result = await authApi.getSession()
    if (sessionStore.getState().token === token) confirmSession(result.user, result.expiresAt)
  } catch (error) {
    if (sessionStore.getState().token !== token) return
    if (hasErrorCode(error, 'SESSION_EXPIRED', 'UNAUTHENTICATED')) expireSession(EXPIRY_REASON.expired)
  }
}
