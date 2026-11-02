import { cva, type VariantProps } from 'class-variance-authority'
import { Slot as SlotPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'
import { SpinnerIcon } from './spinner'

export const buttonVariants = cva(
  [
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 font-mono font-bold whitespace-nowrap select-none',
    'transition-[background-color,border-color,color,box-shadow,opacity] duration-150',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent',
    'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground hover:bg-text-accent active:bg-primary aria-[busy=true]:hover:bg-primary',
        outline:
          'border border-primary bg-transparent text-text-accent hover:bg-primary/12 active:bg-primary/20',
        ghost: 'bg-transparent text-foreground hover:bg-surface-raised hover:text-text-accent',
        link: 'h-auto px-0 font-medium text-text-accent underline-offset-4 hover:underline',
        icon: 'bg-surface-raised text-foreground hover:text-text-accent',
      },
      size: {
        sm: 'h-8 rounded-sm px-3 text-sm',
        md: 'h-[42px] rounded-sm px-5 text-sm',
        lg: 'h-12 rounded-sm px-6 text-base',
        'pill-lg': 'h-14 rounded-pill px-8 text-base',
        icon: 'size-9 rounded-sm',
      },
    },
    compoundVariants: [
      // No mobile o CTA pill do Figma tem um leve degradê para o tom escurecido do primário.
      {
        variant: 'primary',
        size: 'pill-lg',
        className:
          'bg-[linear-gradient(90deg,var(--color-primary),color-mix(in_oklab,var(--color-primary)_78%,var(--color-ink)))] hover:bg-[linear-gradient(90deg,var(--color-text-accent),var(--color-primary))]',
      },
      { variant: 'link', className: 'h-auto rounded-xs px-0' },
    ],
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
    /** Texto lido por leitores de tela enquanto `loading` estiver ativo. */
    loadingLabel?: string
  }

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  loadingLabel,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  if (asChild) {
    return (
      <SlotPrimitive.Slot className={cn(buttonVariants({ variant, size }), className)} {...props}>
        {children}
      </SlotPrimitive.Slot>
    )
  }

  return (
    <button
      type={type ?? 'button'}
      className={cn(buttonVariants({ variant, size }), className)}
      // `disabled` tiraria o foco do botão no meio do envio; com aria-disabled o foco permanece.
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      {...props}
      // Sem isto o mousedown tira o foco do campo, a validação "onTouched" mostra o erro, o layout desce
      // e o mouseup cai fora do botão: o primeiro clique em "Salvar" se perdia. O submit valida tudo.
      onMouseDown={
        type === 'submit'
          ? (event) => {
              props.onMouseDown?.(event)
              if (event.button === 0) event.preventDefault()
            }
          : props.onMouseDown
      }
      onClick={loading ? (event) => event.preventDefault() : props.onClick}
    >
      {loading ? <SpinnerIcon /> : null}
      {children}
      {loading && loadingLabel ? <span className="sr-only">{loadingLabel}</span> : null}
    </button>
  )
}
