import { CircleAlert, ImageUp } from 'lucide-react'
import { useId, useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/api/errors'
import { AvatarFileError, fileToAvatarDataUrl, useRemoveAvatar, useUpdateAvatar } from '@/features/profile/hooks'

/** Avatar com prévia circular; "Alterar" abre o seletor de arquivo e já envia (não depende do "Salvar"). */
export function AvatarField({ avatarUrl, disabled = false }: { avatarUrl: string | null; disabled?: boolean }) {
  const ids = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const update = useUpdateAvatar()
  const remove = useRemoveAvatar()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = processing || update.isPending || remove.isPending

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    setProcessing(true)
    let dataUrl: string
    try {
      dataUrl = await fileToAvatarDataUrl(file)
    } catch (err) {
      setError(err instanceof AvatarFileError ? err.message : 'Não foi possível ler a imagem. Tente outro arquivo.')
      return
    } finally {
      setProcessing(false)
    }
    update.mutate(dataUrl, {
      onSuccess: () => toast.success('Foto de perfil atualizada.'),
      onError: (err) => setError(getErrorMessage(err)),
    })
  }

  const handleRemove = () => {
    setError(null)
    remove.mutate(undefined, {
      onSuccess: () => toast.success('Foto de perfil removida.'),
      onError: (err) => setError(getErrorMessage(err)),
    })
  }

  const describedBy = [`${ids}-hint`, error ? `${ids}-error` : null].filter(Boolean).join(' ')

  return (
    <div role="group" aria-labelledby={`${ids}-label`} className="flex flex-col gap-2">
      <span id={`${ids}-label`} className="text-sm leading-5 text-foreground">
        Avatar
      </span>
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Sua foto de perfil atual" width={52} height={52} className="size-[52px] shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-accent">
            <ImageUp aria-hidden="true" className="size-5" strokeWidth={1.75} />
            <span className="sr-only">Sem foto de perfil</span>
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => void handleFile(event)}
        />
        <Button
          onClick={() => inputRef.current?.click()}
          loading={processing || update.isPending}
          loadingLabel="Enviando foto"
          disabled={disabled || remove.isPending}
          aria-describedby={describedBy}
          className="h-10 w-[98px] px-3"
        >
          Alterar
          <span className="sr-only"> foto de perfil</span>
        </Button>
        <Button
          variant="ghost"
          onClick={handleRemove}
          loading={remove.isPending}
          loadingLabel="Removendo foto"
          disabled={disabled || !avatarUrl || busy}
          className="h-10 px-2 font-normal"
        >
          Remover
          <span className="sr-only"> foto de perfil</span>
        </Button>
      </div>
      <p id={`${ids}-hint`} className="text-xs leading-4 text-text-secondary">
        PNG, JPEG ou WebP. Recortamos ao centro em 256 × 256.
      </p>
      {error ? (
        <p id={`${ids}-error`} role="alert" className="flex items-start gap-1.5 text-xs leading-4 text-danger">
          <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  )
}
