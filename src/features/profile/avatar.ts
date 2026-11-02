import { updateAvatarRequestSchema } from '@/shared/contracts'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_INPUT_BYTES = 8 * 1024 * 1024
const AVATAR_SIZE = 256

export class AvatarFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AvatarFileError'
  }
}

/**
 * Recorta ao centro e reduz para 256x256 antes do upload: a foto original do celular passaria do
 * limite do contrato (~1 MB em data URL) e não há ganho visual num avatar desse tamanho.
 */
export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new AvatarFileError('Formato não suportado. Use PNG, JPEG ou WebP.')
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new AvatarFileError('A imagem deve ter no máximo 8 MB.')
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new AvatarFileError('Não foi possível ler a imagem. Tente outro arquivo.')
  }

  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = AVATAR_SIZE
    canvas.height = AVATAR_SIZE
    const context = canvas.getContext('2d')
    if (!context) throw new AvatarFileError('Seu navegador não conseguiu processar a imagem.')
    context.imageSmoothingQuality = 'high'
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE,
    )
    // Navegadores sem encoder WebP devolvem PNG silenciosamente; nesse caso JPEG fica menor.
    let dataUrl = canvas.toDataURL('image/webp', 0.85)
    if (!dataUrl.startsWith('data:image/webp')) dataUrl = canvas.toDataURL('image/jpeg', 0.85)

    const result = updateAvatarRequestSchema.safeParse({ dataUrl })
    if (!result.success) throw new AvatarFileError(result.error.issues[0]?.message ?? 'Imagem inválida.')
    return result.data.dataUrl
  } finally {
    bitmap.close()
  }
}
