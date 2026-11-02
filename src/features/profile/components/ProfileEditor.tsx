import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, type FormEvent } from 'react'
import { Controller, useForm, type FieldValues, type UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { FormField } from '@/components/common/FormField'
import { PasswordInput } from '@/components/common/PasswordInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { applyFieldErrors, getErrorMessage } from '@/api/errors'
import { useChangePassword, useUpdateProfile } from '@/features/profile/hooks'
import { EnsNameInput } from '@/features/wallets/components/fields'
import {
  changePasswordFormSchema,
  updateProfileRequestSchema,
  type ChangePasswordForm,
  type Profile,
  type UpdateProfileRequest,
} from '@/shared/contracts'
import { AvatarField } from './AvatarField'

const toFormValues = (profile: Profile): UpdateProfileRequest => ({
  displayName: profile.displayName,
  username: profile.username,
  email: profile.email,
  walletNickname: profile.walletNickname,
  ensName: profile.ensName,
  ensSuffix: profile.ensSuffix,
})

const EMPTY_PASSWORD: ChangePasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' }

/** handleSubmit como promessa: valores já transformados pelo schema, ou null (e foco no 1º erro). */
function validated<TValues extends FieldValues, TOutput>(form: UseFormReturn<TValues, unknown, TOutput>): Promise<TOutput | null> {
  return new Promise((resolve) => {
    void form.handleSubmit(
      (values) => resolve(values),
      () => resolve(null),
    )()
  })
}

const sectionTitle = 'text-[15px] leading-6 font-bold text-foreground'

/**
 * "Perfil do colecionador" + "Alterar senha" com um único "Salvar", como no Figma. A senha só é
 * validada e enviada quando algum dos três campos foi preenchido.
 */
export function ProfileEditor({ profile }: { profile: Profile }) {
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const values = useMemo(() => toFormValues(profile), [profile])

  const profileForm = useForm<UpdateProfileRequest>({
    resolver: zodResolver(updateProfileRequestSchema),
    values,
    // Refetch em segundo plano (foco na janela) não pode apagar o que está sendo editado.
    resetOptions: { keepDirtyValues: true },
    mode: 'onTouched',
  })
  const passwordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: EMPTY_PASSWORD,
    mode: 'onTouched',
  })

  const saving = updateProfile.isPending || changePassword.isPending
  const profileErrors = profileForm.formState.errors
  const passwordErrors = passwordForm.formState.errors

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    const wantsPassword = Object.values(passwordForm.getValues()).some(Boolean)

    const profileValues = await validated(profileForm)
    if (!profileValues) return
    const passwordValues = wantsPassword ? await validated(passwordForm) : null
    if (wantsPassword && !passwordValues) return

    // Compara com o que o servidor tem; formState.isDirty só é rastreado se lido durante o render.
    const profileDirty = (Object.keys(values) as (keyof UpdateProfileRequest)[]).some((key) => profileValues[key] !== values[key])
    if (!profileDirty && !passwordValues) {
      toast.info('Nenhuma alteração para salvar.')
      return
    }

    const tasks: Promise<void>[] = []
    if (profileDirty) {
      tasks.push(
        updateProfile
          .mutateAsync(profileValues)
          .then((saved) => {
            profileForm.reset(toFormValues(saved))
            toast.success('Perfil atualizado.')
          })
          .catch((error: unknown) => {
            if (!applyFieldErrors(error, profileForm.setError)) toast.error(getErrorMessage(error))
          }),
      )
    }
    if (passwordValues) {
      const { currentPassword, newPassword } = passwordValues
      tasks.push(
        changePassword
          .mutateAsync({ currentPassword, newPassword })
          .then(() => {
            passwordForm.reset(EMPTY_PASSWORD)
            toast.success('Senha alterada.')
          })
          .catch((error: unknown) => {
            if (!applyFieldErrors(error, passwordForm.setError)) toast.error(getErrorMessage(error))
          }),
      )
    }
    await Promise.all(tasks)
  }

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} aria-labelledby="profile-title" className="flex flex-col">
      <h2 id="profile-title" className={sectionTitle}>
        Perfil do colecionador
      </h2>

      <fieldset className="mt-6 grid gap-x-[29px] gap-y-6 md:mt-[34px] md:grid-cols-2 md:gap-y-8">
        <legend className="sr-only">Dados do perfil</legend>
        <FormField label="Nome de exibição" required error={profileErrors.displayName?.message}>
          {(c) => <Input {...c} {...profileForm.register('displayName')} autoComplete="name" />}
        </FormField>
        <FormField label="Nome de usuário" required error={profileErrors.username?.message}>
          {(c) => <Input {...c} {...profileForm.register('username')} autoComplete="username" spellCheck={false} />}
        </FormField>
        <FormField label="E-mail" required error={profileErrors.email?.message}>
          {(c) => <Input {...c} {...profileForm.register('email')} type="email" autoComplete="email" inputMode="email" />}
        </FormField>
        <Controller
          control={profileForm.control}
          name="ensSuffix"
          render={({ field }) => (
            <FormField label="Nome ENS" required error={profileErrors.ensName?.message}>
              {(c) => (
                <EnsNameInput {...c} {...profileForm.register('ensName')} suffix={field.value} onSuffixChange={field.onChange} suffixDisabled={saving} />
              )}
            </FormField>
          )}
        />
        <FormField label="Apelido da carteira" required error={profileErrors.walletNickname?.message}>
          {(c) => <Input {...c} {...profileForm.register('walletNickname')} autoComplete="off" />}
        </FormField>
        <AvatarField avatarUrl={profile.avatarUrl} disabled={saving} />
      </fieldset>

      <h2 id="password-title" className={`${sectionTitle} mt-8 md:mt-10`}>
        Alterar senha
      </h2>
      <p id="password-hint" className="mt-1 text-xs leading-4 text-text-secondary">
        Preencha só se quiser trocar a senha.
      </p>
      <fieldset
        aria-labelledby="password-title"
        aria-describedby="password-hint"
        className="mt-5 grid gap-y-5 md:w-[calc(50%-14.5px)] md:gap-y-[21px]"
      >
        <FormField label="Senha atual" error={passwordErrors.currentPassword?.message}>
          {(c) => <PasswordInput {...c} {...passwordForm.register('currentPassword')} autoComplete="current-password" toggleLabel="Mostrar senha atual" />}
        </FormField>
        <FormField label="Nova senha" error={passwordErrors.newPassword?.message} hint="Mínimo de 8 caracteres, com letras e números.">
          {(c) => <PasswordInput {...c} {...passwordForm.register('newPassword')} autoComplete="new-password" toggleLabel="Mostrar nova senha" />}
        </FormField>
        <FormField label="Confirmar nova senha" error={passwordErrors.confirmPassword?.message}>
          {(c) => (
            <PasswordInput {...c} {...passwordForm.register('confirmPassword')} autoComplete="new-password" toggleLabel="Mostrar confirmação da nova senha" />
          )}
        </FormField>
      </fieldset>

      <Button type="submit" loading={saving} loadingLabel="Salvando" className="mt-8 w-full md:w-[131px]">
        Salvar
      </Button>
    </form>
  )
}

export function ProfileEditorSkeleton() {
  return (
    <div aria-busy="true">
      <span role="status" className="sr-only">
        Carregando perfil
      </span>
      <Skeleton className="h-5 w-52" />
      <div className="mt-6 grid gap-x-[29px] gap-y-6 md:mt-[34px] md:grid-cols-2 md:gap-y-8">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-12 md:h-[42px]" />
          </div>
        ))}
      </div>
      <div className="mt-10 grid gap-y-5 md:w-[calc(50%-14.5px)]">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-12 md:h-[42px]" />
          </div>
        ))}
      </div>
    </div>
  )
}
