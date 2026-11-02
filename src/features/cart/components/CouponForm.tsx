import { zodResolver } from '@hookform/resolvers/zod'
import { TicketPercent, X } from 'lucide-react'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormField } from '@/components/common/FormField'
import { Button } from '@/components/ui/button'
import { getErrorMessage, hasErrorCode } from '@/api/errors'
import { useApplyCoupon, useRemoveCoupon } from '@/features/cart/hooks'
import { applyCouponRequestSchema, type ApplyCouponRequest } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'

type CouponFormProps = {
  /** Cupom gravado no carrinho (`cart.couponCode`). */
  appliedCode: string | null
  /** Descrição devolvida pela cotação ("10% de desconto"), quando disponível. */
  appliedDescription?: string
  variant?: 'desktop' | 'mobile'
  disabled?: boolean
  className?: string
}

export function CouponForm({ appliedCode, appliedDescription, variant = 'desktop', disabled = false, className }: CouponFormProps) {
  const applyCoupon = useApplyCoupon()
  const removeCoupon = useRemoveCoupon()
  const fieldId = useId()
  const form = useForm<ApplyCouponRequest>({
    resolver: zodResolver(applyCouponRequestSchema),
    defaultValues: { code: '' },
  })
  const error = form.formState.errors.code?.message

  const onSubmit = form.handleSubmit(async ({ code }) => {
    try {
      const cart = await applyCoupon.mutateAsync({ code: code.toUpperCase() })
      form.reset({ code: '' })
      toast.success(`Cupom ${cart.couponCode ?? code.toUpperCase()} aplicado.`)
    } catch (err) {
      // Cupom recusado é erro do campo; o resto (rede, servidor) vira aviso geral.
      if (hasErrorCode(err, 'COUPON_INVALID', 'COUPON_EXPIRED', 'VALIDATION_ERROR')) {
        form.setError('code', { type: 'server', message: getErrorMessage(err) }, { shouldFocus: true })
      } else {
        toast.error(getErrorMessage(err))
      }
    }
  })

  const handleRemove = () => {
    removeCoupon.mutate(undefined, {
      onSuccess: () => toast.success('Cupom removido.'),
      onError: (err) => toast.error(getErrorMessage(err)),
    })
  }

  if (appliedCode) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {variant === 'desktop' ? <p className="text-sm leading-5 font-bold text-foreground">Código promocional</p> : null}
        <div className="flex min-h-[42px] items-center justify-between gap-3 rounded-sm border border-primary/60 bg-surface-card px-3 py-2">
          <p className="flex min-w-0 items-center gap-2 text-sm">
            <TicketPercent aria-hidden="true" className="size-4 shrink-0 text-text-accent" />
            <span className="min-w-0">
              <span className="font-bold text-foreground">{appliedCode}</span>
              <span className="text-text-secondary"> aplicado{appliedDescription ? ` · ${appliedDescription}` : ''}</span>
            </span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            loading={removeCoupon.isPending}
            loadingLabel="Removendo cupom"
            disabled={disabled}
            className="h-7 px-2 text-text-accent"
            aria-label={`Remover cupom ${appliedCode}`}
          >
            {removeCoupon.isPending ? null : <X aria-hidden="true" />}
            <span aria-hidden="true">Remover</span>
          </Button>
        </div>
      </div>
    )
  }

  const isMobile = variant === 'mobile'

  return (
    <form noValidate onSubmit={onSubmit} className={className} aria-label="Cupom de desconto">
      <FormField
        id={fieldId}
        label={<span className="font-bold">Código promocional</span>}
        hideLabel={isMobile}
        error={error}
      >
        {(control) => (
          <div
            className={cn(
              'flex min-w-0 items-stretch',
              isMobile
                ? 'h-14 rounded-pill border border-field-border bg-ink p-1 pl-5 focus-within:border-text-accent'
                : 'h-[42px] overflow-hidden rounded-sm border border-field-border bg-surface-card focus-within:border-text-accent',
              error && 'border-danger',
            )}
          >
            <input
              {...control}
              {...form.register('code')}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="Digite o código promocional..."
              disabled={disabled}
              className={cn(
                'min-w-0 flex-1 bg-transparent font-mono text-foreground outline-none placeholder:text-secondary',
                isMobile ? 'text-base' : 'px-3 text-[13px]',
              )}
            />
            <Button
              type="submit"
              size={isMobile ? 'md' : 'sm'}
              loading={applyCoupon.isPending}
              loadingLabel="Aplicando cupom"
              disabled={disabled}
              className={cn(
                isMobile
                  ? 'h-full rounded-pill px-5 text-base'
                  : 'h-full rounded-none px-5 text-sm',
              )}
            >
              Aplicar
            </Button>
          </div>
        )}
      </FormField>
    </form>
  )
}
