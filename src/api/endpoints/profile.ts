import {
  profileSchema,
  type ChangePasswordRequest,
  type Profile,
  type UpdateAvatarRequest,
  type UpdateProfileRequest,
} from '@/shared/contracts'
import { http, parseResponse, type RequestOptions } from '../http'

export async function getProfile({ signal }: RequestOptions = {}): Promise<Profile> {
  const { data } = await http.get('/me/profile', { signal })
  return parseResponse(profileSchema, data)
}

export async function updateProfile(body: UpdateProfileRequest, { signal }: RequestOptions = {}): Promise<Profile> {
  const { data } = await http.patch('/me/profile', body, { signal })
  return parseResponse(profileSchema, data)
}

export async function updateAvatar(body: UpdateAvatarRequest, { signal }: RequestOptions = {}): Promise<Profile> {
  const { data } = await http.put('/me/avatar', body, { signal })
  return parseResponse(profileSchema, data)
}

export async function removeAvatar({ signal }: RequestOptions = {}): Promise<Profile> {
  const { data } = await http.delete('/me/avatar', { signal })
  return parseResponse(profileSchema, data)
}

export async function changePassword(body: ChangePasswordRequest, { signal }: RequestOptions = {}): Promise<void> {
  await http.post('/me/password', body, { signal })
}
