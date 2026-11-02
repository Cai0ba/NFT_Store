import type { ChangePasswordRequest, Profile, UpdateAvatarRequest, UpdateProfileRequest } from '@/shared/contracts'
import { db } from '../db/store'
import type { UserRecord } from '../db/schema'
import { hashPassword, randomSalt, verifyPassword } from '../lib/password'
import { nowIso } from '../lib/text'
import { assertIdentityAvailable, type AuthContext } from './auth'
import { fail, MockApiError } from './errors'

export function toProfile(user: UserRecord): Profile {
  return {
    displayName: user.displayName,
    username: user.username,
    email: user.email,
    walletNickname: user.walletNickname,
    ensName: user.ensName,
    ensSuffix: user.ensSuffix,
    avatarUrl: user.avatarUrl,
    updatedAt: user.updatedAt,
  }
}

export function updateProfile(user: UserRecord, input: UpdateProfileRequest) {
  assertIdentityAvailable(input, user.id)
  db.mutate(() => {
    Object.assign(user, { ...input, email: input.email.toLowerCase(), updatedAt: nowIso() })
  })
  return toProfile(user)
}

export function setAvatar(user: UserRecord, input: UpdateAvatarRequest | null) {
  db.mutate(() => {
    user.avatarUrl = input?.dataUrl ?? null
    user.updatedAt = nowIso()
  })
  return toProfile(user)
}

/** Troca de senha encerra as outras sessões da conta; a sessão atual continua válida. */
export async function changePassword({ user, session }: AuthContext, input: ChangePasswordRequest) {
  const valid = await verifyPassword(input.currentPassword, user.passwordSalt, user.passwordHash)
  if (!valid) {
    throw new MockApiError(422, 'INVALID_PASSWORD', 'A senha atual está incorreta.', {
      fieldErrors: { currentPassword: 'Senha atual incorreta' },
    })
  }
  if (input.newPassword === input.currentPassword) {
    throw fail.validation({ newPassword: 'A nova senha deve ser diferente da atual' })
  }
  const passwordSalt = randomSalt()
  const passwordHash = await hashPassword(input.newPassword, passwordSalt)
  db.mutate((s) => {
    Object.assign(user, { passwordSalt, passwordHash, updatedAt: nowIso() })
    s.sessions = s.sessions.filter((other) => other.userId !== user.id || other.token === session.token)
  })
}
