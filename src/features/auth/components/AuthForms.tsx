import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { applyFieldErrors, getErrorMessage, hasErrorCode } from '@/api/errors'
import { FormField } from '@/components/common/FormField'
import { PasswordInput } from '@/components/common/PasswordInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLogin, useRegister, useSessionExpiry } from '@/features/auth/session'
import { loginRequestSchema, registerFormSchema, type LoginRequest, type RegisterForm, type Session } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'
import { AuthDivider, forgotPassword, FormAlert, SocialLogin } from './AuthParts'
import { safeRedirect } from './redirect'

type Variant = 'dialog' | 'screen'

type AuthFormProps = {
  redirect: string | undefined
  variant: Variant
  /** No modal desktop o foco vai direto ao primeiro campo; na tela mobile não, para não abrir o teclado sozinho. */
  autoFocus?: boolean
}

function useCompleteAuth(redirect: string | undefined) {
  const navigate = useNavigate()
  const { resumeHref, acknowledge } = useSessionExpiry()
  return (session: Session, message: string) => {
    const target = redirect ?? safeRedirect(resumeHref) ?? '/'
    acknowledge()
    toast.success(message, { description: `Conectado como @${session.user.username}.` })
    void navigate({ href: target, replace: true })
  }
}

function ExpiryNotice() {
  const { reason } = useSessionExpiry()
  return reason ? <FormAlert tone="warning">{reason}</FormAlert> : null
}

const submitClass = (variant: Variant) =>
  variant === 'dialog' ? 'h-[42px] w-full text-base' : 'h-14 w-full rounded-md text-base'

export function LoginForm({ redirect, variant, autoFocus = false }: AuthFormProps) {
  const ids = useId()
  const login = useLogin()
  const complete = useCompleteAuth(redirect)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    if (autoFocus) setFocus('email')
  }, [autoFocus, setFocus])

  useEffect(() => {
    if (formError) document.getElementById(`${ids}-alert`)?.focus()
  }, [formError, ids])

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const session = await login.mutateAsync(values)
      complete(session, `Bem-vindo de volta, ${session.user.displayName}!`)
    } catch (error) {
      if (hasErrorCode(error, 'INVALID_CREDENTIALS')) {
        setFormError('E-mail ou senha incorretos. Confira os dados e tente novamente.')
        return
      }
      if (!applyFieldErrors(error, setError)) setFormError(getErrorMessage(error))
    }
  })

  return (
    <form noValidate onSubmit={onSubmit} aria-describedby={formError ? `${ids}-alert` : undefined} className="flex flex-col">
      <div className="flex flex-col gap-4">
        <ExpiryNotice />
        {formError ? <FormAlert id={`${ids}-alert`}>{formError}</FormAlert> : null}
        <FormField label="E-mail" hideLabel required error={errors.email?.message}>
          {(field) => (
            <Input
              {...field}
              {...register('email')}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="contato@email.com"
            />
          )}
        </FormField>
        <FormField label="Senha" hideLabel required error={errors.password?.message}>
          {(field) => <PasswordInput {...field} {...register('password')} autoComplete="current-password" placeholder="Senha" />}
        </FormField>
      </div>
      <button
        type="button"
        onClick={forgotPassword}
        className={cn(
          'mt-3 cursor-pointer self-end rounded-xs text-text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent',
          variant === 'dialog' ? 'text-[13px]' : 'text-sm',
        )}
      >
        Esqueceu a senha?
      </button>
      <Button type="submit" className={cn(submitClass(variant), variant === 'dialog' ? 'mt-5' : 'mt-10')} loading={login.isPending} loadingLabel="Entrando">
        Entrar
      </Button>
      <AuthFooter variant={variant} mode="login" redirect={redirect} />
    </form>
  )
}

export function RegisterForm({ redirect, variant, autoFocus = false }: AuthFormProps) {
  const ids = useId()
  const registerMutation = useRegister()
  const complete = useCompleteAuth(redirect)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerFormSchema),
    mode: 'onTouched',
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (autoFocus) setFocus('username')
  }, [autoFocus, setFocus])

  useEffect(() => {
    if (formError) document.getElementById(`${ids}-alert`)?.focus()
  }, [formError, ids])

  const onSubmit = handleSubmit(async ({ confirmPassword: _confirm, ...body }) => {
    setFormError(null)
    try {
      const session = await registerMutation.mutateAsync(body)
      complete(session, `Conta criada. Boas-vindas à Kurio, ${session.user.displayName}!`)
    } catch (error) {
      if (applyFieldErrors(error, setError)) return
      // Conflito sem fieldErrors ainda pertence a um campo específico.
      if (hasErrorCode(error, 'EMAIL_TAKEN')) return setError('email', { type: 'server', message: getErrorMessage(error) }, { shouldFocus: true })
      if (hasErrorCode(error, 'USERNAME_TAKEN'))
        return setError('username', { type: 'server', message: getErrorMessage(error) }, { shouldFocus: true })
      setFormError(getErrorMessage(error))
    }
  })

  return (
    <form noValidate onSubmit={onSubmit} aria-describedby={formError ? `${ids}-alert` : undefined} className="flex flex-col">
      <div className="flex flex-col gap-4">
        <ExpiryNotice />
        {formError ? <FormAlert id={`${ids}-alert`}>{formError}</FormAlert> : null}
        <FormField label="Nome de usuário" hideLabel required error={errors.username?.message}>
          {(field) => (
            <Input
              {...field}
              {...register('username')}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Nome de usuário"
            />
          )}
        </FormField>
        <FormField label="E-mail" hideLabel required error={errors.email?.message}>
          {(field) => (
            <Input {...field} {...register('email')} type="email" inputMode="email" autoComplete="email" placeholder="Digite seu e-mail" />
          )}
        </FormField>
        <FormField label="Senha" hideLabel required error={errors.password?.message}>
          {(field) => <PasswordInput {...field} {...register('password')} autoComplete="new-password" placeholder="Senha" />}
        </FormField>
        <FormField label="Confirmar senha" hideLabel required error={errors.confirmPassword?.message}>
          {(field) => (
            <PasswordInput
              {...field}
              {...register('confirmPassword')}
              autoComplete="new-password"
              placeholder="Confirmar senha"
              toggleLabel="Mostrar confirmação de senha"
            />
          )}
        </FormField>
      </div>
      <Button
        type="submit"
        className={cn(submitClass(variant), variant === 'dialog' ? 'mt-6' : 'mt-10')}
        loading={registerMutation.isPending}
        loadingLabel="Criando conta"
      >
        {variant === 'dialog' ? 'Criar conta' : 'Criar perfil'}
      </Button>
      <AuthFooter variant={variant} mode="register" redirect={redirect} />
    </form>
  )
}

function AuthFooter({ variant, mode, redirect }: { variant: Variant; mode: 'login' | 'register'; redirect: string | undefined }) {
  return (
    <>
      {variant === 'dialog' ? (
        // A linha do Figma atravessa o modal inteiro, além do padding do formulário.
        <AuthDivider className="-mx-6 mt-5 mb-4 sm:-mx-[84px]" />
      ) : (
        <AuthDivider className="mt-10 mb-4" />
      )}
      <SocialLogin variant={variant} />
      {variant === 'screen' ? (
        <p className="mt-10 text-center text-[15px] leading-6 text-text-secondary">
          {mode === 'login' ? 'Novo na Kurio? ' : 'Já tem uma conta? '}
          <Link
            to={mode === 'login' ? '/cadastro' : '/entrar'}
            search={{ redirect }}
            replace
            className="rounded-xs text-text-secondary underline-offset-4 hover:text-text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent"
          >
            {mode === 'login' ? 'Crie uma conta' : 'Entre'}
          </Link>
        </p>
      ) : null}
    </>
  )
}
