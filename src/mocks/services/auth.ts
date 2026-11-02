import type { LoginRequest, RegisterRequest, Session, SessionResponse, User } from '@/shared/contracts'
import { db } from '../db/store'
import type { SessionRecord, UserRecord } from '../db/schema'
import { hashPassword, randomSalt, randomToken, verifyPassword } from '../lib/password'
import { isoAt, nowIso } from '../lib/text'
import { runtime } from '../runtime'
import { fail, MockApiError } from './errors'

export interface AuthContext {
  user: UserRecord
  session: SessionRecord
}

export const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export function toUser(user: UserRecord): User {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  }
}

export function bearerToken(request: Request) {
  const header = request.headers.get('Authorization')
  const match = header?.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}

type TokenCheck = { status: 'valid'; context: AuthContext } | { status: 'expired' | 'invalid' }

export function checkToken(token: string): TokenCheck {
  const session = db.state.sessions.find((s) => s.token === token)
  const user = session && db.state.users.find((u) => u.id === session.userId)
  if (!session || !user) return { status: 'invalid' }
  if (session.expiresAt <= Date.now()) return { status: 'expired' }
  return { status: 'valid', context: { user, session } }
}

export function requireAuth(request: Request): AuthContext {
  const token = bearerToken(request)
  if (!token) throw fail.unauthenticated()
  const check = checkToken(token)
  if (check.status !== 'valid') throw check.status === 'expired' ? fail.sessionExpired() : fail.unauthenticated()
  return check.context
}

/** Rotas abertas a visitantes: sem header é anônimo, mas um token inválido ou expirado ainda é erro. */
export function optionalAuth(request: Request): AuthContext | null {
  return bearerToken(request) ? requireAuth(request) : null
}

function openSession(user: UserRecord): Session {
  const now = Date.now()
  const session: SessionRecord = {
    token: randomToken(),
    userId: user.id,
    createdAt: now,
    expiresAt: now + runtime.scenario().sessionTtlMs,
  }
  db.mutate((s) => s.sessions.push(session))
  return { token: session.token, expiresAt: isoAt(session.expiresAt), user: toUser(user) }
}

export async function login(input: LoginRequest): Promise<Session> {
  const user = db.state.users.find((u) => sameText(u.email, input.email))
  const valid = user ? await verifyPassword(input.password, user.passwordSalt, user.passwordHash) : false
  if (!user || !valid) throw new MockApiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
  return openSession(user)
}

export function assertIdentityAvailable(input: { email: string; username: string }, exceptUserId?: string) {
  const others = db.state.users.filter((u) => u.id !== exceptUserId)
  const fieldErrors: Record<string, string> = {}
  if (others.some((u) => sameText(u.email, input.email))) fieldErrors.email = 'Este e-mail já está em uso'
  if (others.some((u) => sameText(u.username, input.username))) fieldErrors.username = 'Este nome de usuário já está em uso'
  if (fieldErrors.email) throw fail.conflict('EMAIL_TAKEN', 'Já existe uma conta com este e-mail.', { fieldErrors })
  if (fieldErrors.username) throw fail.conflict('USERNAME_TAKEN', 'Este nome de usuário já está em uso.', { fieldErrors })
}

export async function register(input: RegisterRequest): Promise<Session> {
  assertIdentityAvailable(input)
  const passwordSalt = randomSalt()
  const now = nowIso()
  const user: UserRecord = {
    id: db.nextId('usr'),
    username: input.username,
    email: input.email.toLowerCase(),
    displayName: input.username,
    avatarUrl: null,
    walletNickname: 'Minha carteira',
    ensName: '',
    ensSuffix: '.eth',
    passwordSalt,
    passwordHash: await hashPassword(input.password, passwordSalt),
    createdAt: now,
    updatedAt: now,
  }
  db.mutate((s) => {
    s.users.push(user)
    s.favorites[user.id] = []
  })
  return openSession(user)
}

export function sessionInfo(context: AuthContext): SessionResponse {
  return { user: toUser(context.user), expiresAt: isoAt(context.session.expiresAt) }
}

export function logout(request: Request) {
  const token = bearerToken(request)
  if (!token) return
  db.mutate((s) => {
    s.sessions = s.sessions.filter((session) => session.token !== token)
  })
}

/** Usado pelo tempo real: a cada envio confere se o token da conexão ainda vale. */
export function userIdForToken(token: string | null) {
  if (!token) return null
  const check = checkToken(token)
  return check.status === 'valid' ? check.context.user.id : null
}
