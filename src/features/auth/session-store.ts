import { z } from 'zod'
import { userSchema, type Session, type User } from '@/shared/contracts'
import { readStorage, removeStorage, storageKey, writeStorage } from '@/shared/lib/storage'

/**
 * Estado da sessão fora do React: o interceptor do Axios, o guard das rotas e o socket precisam
 * ler o token de forma síncrona, sem depender de render.
 */
export type SessionStatus = 'loading' | 'authenticated' | 'anonymous'

export interface SessionExpiry {
  reason: string
  /** Endereço onde o usuário estava quando a sessão caiu, para voltar após o login. */
  resumeHref: string | null
}

export interface SessionState {
  status: SessionStatus
  user: User | null
  token: string | null
  expiresAt: string | null
  expiry: SessionExpiry | null
}

const SESSION_STORAGE = 'session'
const persistedSessionSchema = z.object({ token: z.string(), expiresAt: z.string(), user: userSchema })

const persisted = readStorage('local', SESSION_STORAGE, persistedSessionSchema)

let state: SessionState = persisted
  ? { status: 'loading', user: persisted.user, token: persisted.token, expiresAt: persisted.expiresAt, expiry: null }
  : { status: 'anonymous', user: null, token: null, expiresAt: null, expiry: null }

const listeners = new Set<(next: SessionState, prev: SessionState) => void>()
let readyWaiters: Array<(s: SessionState) => void> = []

function setState(next: SessionState) {
  const prev = state
  state = next
  if (next.status !== 'loading' && readyWaiters.length > 0) {
    const waiters = readyWaiters
    readyWaiters = []
    waiters.forEach((resolve) => resolve(next))
  }
  listeners.forEach((listener) => listener(next, prev))
}

export const sessionStore = {
  getState: () => state,
  subscribe(listener: (next: SessionState, prev: SessionState) => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  /** Resolve quando a validação inicial termina; usado pelos guards durante o boot. */
  whenReady(): Promise<SessionState> {
    if (state.status !== 'loading') return Promise.resolve(state)
    return new Promise((resolve) => readyWaiters.push(resolve))
  },
}

export function getAuthToken() {
  return state.token
}

export function establishSession(session: Session) {
  writeStorage('local', SESSION_STORAGE, session)
  setState({
    status: 'authenticated',
    user: session.user,
    token: session.token,
    expiresAt: session.expiresAt,
    expiry: null,
  })
}

export function confirmSession(user: User, expiresAt: string) {
  if (!state.token) return
  writeStorage('local', SESSION_STORAGE, { token: state.token, expiresAt, user })
  setState({ ...state, status: 'authenticated', user, expiresAt })
}

export function updateSessionUser(patch: Partial<User>) {
  if (!state.user || !state.token || !state.expiresAt) return
  const user = { ...state.user, ...patch }
  writeStorage('local', SESSION_STORAGE, { token: state.token, expiresAt: state.expiresAt, user })
  setState({ ...state, user })
}

export function clearSession(expiry: SessionExpiry | null = null) {
  removeStorage('local', SESSION_STORAGE)
  setState({ status: 'anonymous', user: null, token: null, expiresAt: null, expiry })
}

export const EXPIRY_REASON = {
  expired: 'Sua sessão expirou. Entre novamente para continuar de onde parou.',
  invalid: 'Sua sessão não é mais válida. Entre novamente para continuar de onde parou.',
} as const

/** Encerra a sessão por decisão do servidor, guardando onde o usuário estava para a retomada. */
export function expireSession(reason: string) {
  const { pathname, search, hash } = window.location
  clearSession({ reason, resumeHref: `${pathname}${search}${hash}` })
}

export function acknowledgeExpiry() {
  if (state.expiry) setState({ ...state, expiry: null })
}

if (typeof window !== 'undefined') {
  // Login ou logout em outra aba: segue o que ficou salvo para não misturar usuários entre abas.
  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey(SESSION_STORAGE)) return
    const next = readStorage('local', SESSION_STORAGE, persistedSessionSchema)
    if (!next) {
      if (state.token) clearSession()
    } else if (next.token !== state.token || next.user.id !== state.user?.id) {
      setState({ status: 'authenticated', user: next.user, token: next.token, expiresAt: next.expiresAt, expiry: null })
    }
  })
}
