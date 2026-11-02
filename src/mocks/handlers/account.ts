import {
  changePasswordRequestSchema,
  profileSchema,
  updateAvatarRequestSchema,
  updateProfileRequestSchema,
  walletConnectionSchema,
  walletsResponseSchema,
} from '@/shared/contracts'
import { requireAuth } from '../services/auth'
import { parseOrFail } from '../services/errors'
import { changePassword, setAvatar, toProfile, updateProfile } from '../services/profile'
import { connectWallet, disconnectWallet, listWallets, upsertWallet } from '../services/wallets'
import { jsonResponse, noContent } from './respond'
import { readJson, route } from './route'

export const accountHandlers = [
  route('get', '/me/profile', ({ request }) => jsonResponse(profileSchema, toProfile(requireAuth(request).user))),

  route('patch', '/me/profile', async ({ request }) => {
    const { user } = requireAuth(request)
    const input = parseOrFail(updateProfileRequestSchema, await readJson(request))
    return jsonResponse(profileSchema, updateProfile(user, input))
  }),

  route('put', '/me/avatar', async ({ request }) => {
    const { user } = requireAuth(request)
    const input = parseOrFail(updateAvatarRequestSchema, await readJson(request))
    return jsonResponse(profileSchema, setAvatar(user, input))
  }),

  route('delete', '/me/avatar', ({ request }) => jsonResponse(profileSchema, setAvatar(requireAuth(request).user, null))),

  route('post', '/me/password', async ({ request }) => {
    const auth = requireAuth(request)
    await changePassword(auth, parseOrFail(changePasswordRequestSchema, await readJson(request)))
    return noContent()
  }),

  route('get', '/me/wallets', ({ request }) => jsonResponse(walletsResponseSchema, listWallets(requireAuth(request).user.id))),

  route('put', '/me/wallets/:slot', async ({ request, params }) => {
    const { user } = requireAuth(request)
    return jsonResponse(walletsResponseSchema, upsertWallet(user.id, params.slot ?? '', await readJson(request)))
  }),

  route('post', '/me/wallets/:walletId/connection', async ({ request, params }) => {
    const { user } = requireAuth(request)
    return jsonResponse(walletConnectionSchema, connectWallet(user.id, params.walletId ?? '', await readJson(request)))
  }),

  route('delete', '/me/wallets/:walletId/connection', ({ request, params }) => {
    disconnectWallet(requireAuth(request).user.id, params.walletId ?? '')
    return noContent()
  }),
]
