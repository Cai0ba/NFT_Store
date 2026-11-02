import {
  sessionResponseSchema,
  sessionSchema,
  type LoginRequest,
  type RegisterRequest,
  type Session,
  type SessionResponse,
} from '@/shared/contracts'
import { http, parseResponse, type RequestOptions } from '../http'

export async function login(body: LoginRequest, { signal }: RequestOptions = {}): Promise<Session> {
  const { data } = await http.post('/auth/login', body, { signal, skipSessionExpiry: true })
  return parseResponse(sessionSchema, data)
}

export async function register(body: RegisterRequest, { signal }: RequestOptions = {}): Promise<Session> {
  const { data } = await http.post('/auth/register', body, { signal, skipSessionExpiry: true })
  return parseResponse(sessionSchema, data)
}

export async function getSession({ signal }: RequestOptions = {}): Promise<SessionResponse> {
  const { data } = await http.get('/auth/session', { signal, skipSessionExpiry: true })
  return parseResponse(sessionResponseSchema, data)
}

export async function logout({ signal }: RequestOptions = {}): Promise<void> {
  await http.post('/auth/logout', undefined, { signal, skipSessionExpiry: true })
}
