import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { FormField } from '@/components/common/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { applyFieldErrors, getErrorMessage } from '@/api/errors'
import { useUpsertWallet } from '@/features/wallets/hooks'
import { walletInputSchema, type WalletInput, type WalletSlot, type WalletsResponse } from '@/shared/contracts'
import { EnsNameInput, NetworkSelect, WalletProviderSelect } from './fields'

export type WalletFormInput = z.input<typeof walletInputSchema>

type WalletFormProps = {
  slot: WalletSlot
  defaultValues: Partial<WalletFormInput>
  onSaved: (wallets: WalletsResponse) => void
  onCancel?: () => void
  autoFocus?: boolean
}

const SLOT_LABEL: Record<WalletSlot, string> = { primary: 'Carteira principal', secondary: 'Carteira secundária' }

/** Campos da carteira na ordem do Figma (duas colunas, leitura linha a linha). */
export function WalletForm({ slot, defaultValues, onSaved, onCancel, autoFocus = false }: WalletFormProps) {
  const upsert = useUpsertWallet(slot)
  const form = useForm<WalletFormInput, unknown, WalletInput>({
    resolver: zodResolver(walletInputSchema),
    defaultValues: { ensSuffix: '.eth', ensOrSecondary: '', ...defaultValues },
    mode: 'onTouched',
  })
  const {
    register,
    control,
    setFocus,
    formState: { errors },
  } = form

  useEffect(() => {
    if (autoFocus) setFocus('displayName')
  }, [autoFocus, setFocus])

  const onSubmit = form.handleSubmit(async (values) => {
    if (upsert.isPending) return
    try {
      const wallets = await upsert.mutateAsync(values)
      toast.success(`${SLOT_LABEL[slot]} salva.`)
      onSaved(wallets)
    } catch (error) {
      if (!applyFieldErrors(error, form.setError)) toast.error(getErrorMessage(error))
    }
  })

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} aria-label={`Formulário da ${SLOT_LABEL[slot].toLowerCase()}`}>
      <fieldset className="grid min-w-0 gap-x-[29px] gap-y-5 md:grid-cols-2">
        <legend className="sr-only">Dados da {SLOT_LABEL[slot].toLowerCase()}</legend>
        <FormField label="Nome de exibição" required error={errors.displayName?.message}>
          {(c) => <Input {...c} {...register('displayName')} autoComplete="name" />}
        </FormField>
        <FormField label="Apelido da carteira" required error={errors.nickname?.message}>
          {(c) => <Input {...c} {...register('nickname')} autoComplete="off" />}
        </FormField>

        <Controller
          control={control}
          name="network"
          render={({ field, fieldState }) => (
            <FormField label="Rede" required error={fieldState.error?.message}>
              {(c) => <NetworkSelect {...c} ref={field.ref} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} />}
            </FormField>
          )}
        />
        <FormField label="Nome do perfil" required error={errors.profileName?.message}>
          {(c) => <Input {...c} {...register('profileName')} autoComplete="off" />}
        </FormField>

        <FormField label="Endereço da carteira" required error={errors.address?.message}>
          {(c) => <Input {...c} {...register('address')} placeholder="Endereço 0x da carteira" autoComplete="off" spellCheck={false} />}
        </FormField>
        <FormField label="ENS ou carteira secundária (opcional)" hideLabel error={errors.ensOrSecondary?.message} className="md:pt-7">
          {(c) => <Input {...c} {...register('ensOrSecondary')} placeholder="ENS ou carteira secundária (opcional)" autoComplete="off" spellCheck={false} />}
        </FormField>

        <Controller
          control={control}
          name="provider"
          render={({ field, fieldState }) => (
            <FormField label="Tipo de carteira" required error={fieldState.error?.message}>
              {(c) => (
                <WalletProviderSelect {...c} ref={field.ref} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} />
              )}
            </FormField>
          )}
        />
        <FormField label="Código de indicação" required error={errors.referralCode?.message}>
          {(c) => <Input {...c} {...register('referralCode')} autoComplete="off" autoCapitalize="characters" spellCheck={false} />}
        </FormField>

        <FormField label="E-mail" required error={errors.email?.message}>
          {(c) => <Input {...c} {...register('email')} type="email" autoComplete="email" inputMode="email" />}
        </FormField>
        <Controller
          control={control}
          name="ensSuffix"
          render={({ field }) => (
            <FormField label="Nome ENS" required error={errors.ensName?.message}>
              {(c) => <EnsNameInput {...c} {...register('ensName')} suffix={field.value} onSuffixChange={field.onChange} />}
            </FormField>
          )}
        />
      </fieldset>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Button type="submit" loading={upsert.isPending} loadingLabel="Salvando carteira" className="h-10 px-3">
          Salvar carteira
        </Button>
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel} disabled={upsert.isPending} className="h-10">
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  )
}
