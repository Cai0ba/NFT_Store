import { Controller, type UseFormReturn } from 'react-hook-form'
import type { z } from 'zod'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { EnsNameInput, NetworkSelect, RingCheckbox, WalletProviderSelect } from '@/features/wallets/components/fields'
import type { collectorInfoSchema, CollectorInfo } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'

export type CollectorFormInput = z.input<typeof collectorInfoSchema>
export type CollectorForm = UseFormReturn<CollectorFormInput, unknown, CollectorInfo>

type CollectorFieldsProps = {
  form: CollectorForm
  /** Endereço vem da carteira selecionada; só fica editável com "Usar outra carteira?". */
  addressLocked: boolean
  disabled?: boolean
  className?: string
}

/** Formulário "Perfil do colecionador" do pagamento, na ordem e com os rótulos do Figma. */
export function CollectorFields({ form, addressLocked, disabled = false, className }: CollectorFieldsProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form

  return (
    <fieldset disabled={disabled} className={cn('grid min-w-0 gap-x-6 gap-y-3 md:grid-cols-2', className)}>
      <legend className="sr-only">Dados do colecionador</legend>

      <FormField label="Nome de exibição" required error={errors.displayName?.message}>
        {(c) => <Input {...c} {...register('displayName')} autoComplete="name" />}
      </FormField>
      <FormField label="Nome de usuário" required error={errors.username?.message}>
        {(c) => <Input {...c} {...register('username')} autoComplete="username" spellCheck={false} />}
      </FormField>

      <Controller
        control={control}
        name="network"
        render={({ field, fieldState }) => (
          <FormField label="Rede" required error={fieldState.error?.message}>
            {(c) => (
              <NetworkSelect {...c} ref={field.ref} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} />
            )}
          </FormField>
        )}
      />
      <FormField label="Nome do perfil" required error={errors.profileName?.message}>
        {(c) => <Input {...c} {...register('profileName')} autoComplete="off" />}
      </FormField>

      <FormField
        label="Endereço da carteira"
        required
        error={errors.walletAddress?.message}
        hint={addressLocked ? 'Preenchido pela carteira selecionada. Marque “Usar outra carteira?” para receber em outro endereço.' : undefined}
      >
        {(c) => (
          <Input
            {...c}
            {...register('walletAddress')}
            readOnly={addressLocked}
            placeholder="Endereço 0x da carteira"
            autoComplete="off"
            spellCheck={false}
            className={cn(addressLocked && 'cursor-default text-text-secondary')}
          />
        )}
      </FormField>
      {/* No Figma este campo não tem rótulo visível; ele se alinha ao campo do endereço. */}
      <FormField label="ENS ou carteira secundária (opcional)" hideLabel error={errors.ensOrSecondary?.message} className="md:pt-7">
        {(c) => (
          <Input {...c} {...register('ensOrSecondary')} placeholder="ENS ou carteira secundária (opcional)" autoComplete="off" spellCheck={false} />
        )}
      </FormField>

      <Controller
        control={control}
        name="walletProvider"
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
        render={({ field: suffix }) => (
          <FormField label="Nome ENS" required error={errors.ensName?.message}>
            {(c) => (
              <EnsNameInput
                {...c}
                {...register('ensName')}
                suffix={suffix.value}
                onSuffixChange={suffix.onChange}
                suffixDisabled={disabled}
              />
            )}
          </FormField>
        )}
      />

      <div className="pt-1 md:col-span-2">
        <RingCheckbox label="Usar outra carteira?" {...register('useOtherWallet')} />
      </div>

      <FormField label="Observação do colecionador (opcional)" error={errors.note?.message} className="pt-1">
        {(c) => <Textarea {...c} {...register('note')} rows={3} className="min-h-[84px]" />}
      </FormField>
    </fieldset>
  )
}
