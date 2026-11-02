import { z } from 'zod'
import { isoDateSchema, networkSchema, walletProviderSchema } from './common'

const username = z
  .string()
  .trim()
  .min(3, 'Use pelo menos 3 caracteres')
  .max(24, 'Use no máximo 24 caracteres')
  .regex(/^[a-z0-9._-]+$/i, 'Use apenas letras, números, ponto, hífen ou sublinhado')

const email = z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido')

export const passwordSchema = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres')
  .max(72, 'Use no máximo 72 caracteres')
  .regex(/[A-Za-z]/, 'Inclua ao menos uma letra')
  .regex(/\d/, 'Inclua ao menos um número')

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
})
export type User = z.infer<typeof userSchema>

export const sessionSchema = z.object({
  token: z.string(),
  expiresAt: isoDateSchema,
  user: userSchema,
})
export type Session = z.infer<typeof sessionSchema>

/* ---------- Sessão ---------- */

export const loginRequestSchema = z.object({
  email,
  password: z.string().min(1, 'Informe a senha'),
})
export type LoginRequest = z.infer<typeof loginRequestSchema>

export const registerRequestSchema = z.object({
  username,
  email,
  password: passwordSchema,
})
export type RegisterRequest = z.infer<typeof registerRequestSchema>

/** Formulário de cadastro: o servidor não recebe a confirmação de senha. */
export const registerFormSchema = registerRequestSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirme a senha') })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })
export type RegisterForm = z.infer<typeof registerFormSchema>

/** GET /api/auth/session */
export const sessionResponseSchema = z.object({ user: userSchema, expiresAt: isoDateSchema })
export type SessionResponse = z.infer<typeof sessionResponseSchema>

/* ---------- Perfil ---------- */

export const ensSuffixSchema = z.enum(['.eth', '.kurio'])

export const profileSchema = z.object({
  displayName: z.string(),
  username: z.string(),
  email: z.string(),
  walletNickname: z.string(),
  ensName: z.string(),
  ensSuffix: ensSuffixSchema,
  avatarUrl: z.string().nullable(),
  updatedAt: isoDateSchema,
})
export type Profile = z.infer<typeof profileSchema>

export const updateProfileRequestSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição').max(40, 'Use no máximo 40 caracteres'),
  username,
  email,
  walletNickname: z.string().trim().min(2, 'Informe o apelido da carteira').max(32, 'Use no máximo 32 caracteres'),
  ensName: z
    .string()
    .trim()
    .max(32, 'Use no máximo 32 caracteres')
    .regex(/^[a-z0-9-]*$/, 'Use apenas letras minúsculas, números e hífen'),
  ensSuffix: ensSuffixSchema,
})
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>

/** PUT /api/me/avatar — a imagem vai como data URL (PNG, JPEG ou WebP, até ~1 MB). */
export const updateAvatarRequestSchema = z.object({
  dataUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,/, 'Formato de imagem não suportado')
    .max(1_400_000, 'A imagem deve ter no máximo 1 MB'),
})
export type UpdateAvatarRequest = z.infer<typeof updateAvatarRequestSchema>

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: passwordSchema,
})
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>

export const changePasswordFormSchema = changePasswordRequestSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirme a nova senha') })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'A nova senha deve ser diferente da atual',
  })
export type ChangePasswordForm = z.infer<typeof changePasswordFormSchema>

/* ---------- Carteiras ---------- */

export const walletSlotSchema = z.enum(['primary', 'secondary'])
export type WalletSlot = z.infer<typeof walletSlotSchema>

export const walletAddressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais')

/** Campos do formulário "Carteira principal/secundária" conforme o Figma. */
export const walletInputSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição').max(40),
  nickname: z.string().trim().min(2, 'Informe o apelido da carteira').max(32),
  network: networkSchema,
  profileName: z.string().trim().min(2, 'Informe o nome do perfil').max(40),
  address: walletAddressSchema,
  ensOrSecondary: z.string().trim().max(64).optional().or(z.literal('')),
  provider: walletProviderSchema,
  referralCode: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{4,12}$/i, 'Código de indicação inválido (4 a 12 letras ou números)'),
  email,
  ensName: z
    .string()
    .trim()
    .min(1, 'Informe o nome ENS')
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífen'),
  ensSuffix: ensSuffixSchema,
})
export type WalletInput = z.infer<typeof walletInputSchema>

export const walletSchema = walletInputSchema.extend({
  id: z.string(),
  slot: walletSlotSchema,
  sameAsPrimary: z.boolean(),
  updatedAt: isoDateSchema,
})
export type Wallet = z.infer<typeof walletSchema>

/** GET /api/me/wallets */
export const walletsResponseSchema = z.object({
  primary: walletSchema.nullable(),
  secondary: walletSchema.nullable(),
})
export type WalletsResponse = z.infer<typeof walletsResponseSchema>

/** PUT /api/me/wallets/:slot — para a secundária, `sameAsPrimary: true` dispensa os demais campos. */
export const upsertWalletRequestSchema = z.union([
  walletInputSchema.extend({ sameAsPrimary: z.literal(false).optional() }),
  z.object({ sameAsPrimary: z.literal(true) }),
])
export type UpsertWalletRequest = z.infer<typeof upsertWalletRequestSchema>

/** POST /api/me/wallets/:walletId/connection — simula a extensão de carteira autorizando a conexão. */
export const walletConnectionRequestSchema = z.object({ network: networkSchema })
export const walletConnectionSchema = z.object({
  walletId: z.string(),
  network: networkSchema,
  status: z.enum(['connected']),
  connectedAt: isoDateSchema,
})
export type WalletConnection = z.infer<typeof walletConnectionSchema>
