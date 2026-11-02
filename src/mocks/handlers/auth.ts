import { loginRequestSchema, registerRequestSchema, sessionResponseSchema, sessionSchema } from '@/shared/contracts'
import { login, logout, register, requireAuth, sessionInfo } from '../services/auth'
import { parseOrFail } from '../services/errors'
import { jsonResponse, noContent } from './respond'
import { readJson, route } from './route'

export const authHandlers = [
  route('post', '/auth/register', async ({ request }) => {
    const input = parseOrFail(registerRequestSchema, await readJson(request))
    return jsonResponse(sessionSchema, await register(input), 201)
  }),

  route('post', '/auth/login', async ({ request }) => {
    const input = parseOrFail(loginRequestSchema, await readJson(request))
    return jsonResponse(sessionSchema, await login(input))
  }),

  route('get', '/auth/session', ({ request }) => jsonResponse(sessionResponseSchema, sessionInfo(requireAuth(request)))),

  route('post', '/auth/logout', ({ request }) => {
    logout(request)
    return noContent()
  }),
]
