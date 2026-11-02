import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useRef, type ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogPortal = DialogPrimitive.Portal
export const DialogClose = DialogPrimitive.Close

export function DialogOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-ink/75 backdrop-blur-[1px]',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        className,
      )}
      {...props}
    />
  )
}

export function DialogCloseButton({ className, label = 'Fechar', ...props }: ComponentProps<typeof DialogPrimitive.Close> & { label?: string }) {
  return (
    <DialogPrimitive.Close
      className={cn(
        'inline-flex size-8 cursor-pointer items-center justify-center rounded-sm text-text-accent',
        'hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent',
        className,
      )}
      {...props}
    >
      <X aria-hidden="true" className="size-5" strokeWidth={1.5} />
      <span className="sr-only">{label}</span>
    </DialogPrimitive.Close>
  )
}

type ContentProps = ComponentProps<typeof DialogPrimitive.Content>

/**
 * O Radix só devolve o foco ao `DialogTrigger`. Diálogos abertos por estado (sheet de filtros,
 * revisão do pedido, login como rota) deixariam o foco no <body>; aqui ele volta para quem estava
 * focado no momento em que o conteúdo abriu.
 */
export function useReturnFocus({
  onOpenAutoFocus,
  onCloseAutoFocus,
}: Pick<ContentProps, 'onOpenAutoFocus' | 'onCloseAutoFocus'>) {
  const opener = useRef<HTMLElement | null>(null)
  return {
    onOpenAutoFocus: (event: Event) => {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      onOpenAutoFocus?.(event)
    },
    onCloseAutoFocus: (event: Event) => {
      onCloseAutoFocus?.(event)
      const target = opener.current
      opener.current = null
      if (event.defaultPrevented || !target || target === document.body || !target.isConnected) return
      event.preventDefault()
      target.focus()
    },
  }
}

export type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  /** Faixa laranja de 6px na base, presente nos modais de login, cadastro e confirmação. */
  accentEdge?: boolean
  showClose?: boolean
  closeLabel?: string
}

export function DialogContent({
  className,
  children,
  accentEdge = false,
  showClose = true,
  closeLabel,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: DialogContentProps) {
  const returnFocus = useReturnFocus({ onOpenAutoFocus, onCloseAutoFocus })
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 gap-4',
          'max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain',
          'bg-surface-card px-6 pt-10 pb-8 text-foreground shadow-card sm:px-14',
          accentEdge && 'border-b-[6px] border-b-primary',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'focus-visible:outline-none',
          className,
        )}
        {...props}
        {...returnFocus}
      >
        {children}
        {showClose ? <DialogCloseButton label={closeLabel} className="absolute top-3 right-3" /> : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

export function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 text-center', className)} {...props} />
}

export function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col-reverse gap-3 sm:flex-row sm:justify-end', className)} {...props} />
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-lg leading-6 font-bold text-foreground', className)} {...props} />
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description className={cn('text-[13px] leading-5 text-text-secondary', className)} {...props} />
  )
}
