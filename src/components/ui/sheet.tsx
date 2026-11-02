import { cva, type VariantProps } from 'class-variance-authority'
import { Dialog as SheetPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'
import { DialogCloseButton, useReturnFocus } from './dialog'

export const Sheet = SheetPrimitive.Root
export const SheetTrigger = SheetPrimitive.Trigger
export const SheetClose = SheetPrimitive.Close

const sheetVariants = cva(
  [
    'fixed z-50 flex flex-col gap-4 bg-surface-card text-foreground shadow-card outline-none',
    'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:duration-300 data-[state=closed]:duration-200',
  ],
  {
    variants: {
      side: {
        left: 'inset-y-0 left-0 h-full w-[min(88vw,360px)] border-r border-border data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
        right:
          'inset-y-0 right-0 h-full w-[min(88vw,360px)] border-l border-border data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
        bottom:
          'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl border-t border-border data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
      },
    },
    defaultVariants: { side: 'bottom' },
  },
)

export type SheetContentProps = ComponentProps<typeof SheetPrimitive.Content> &
  VariantProps<typeof sheetVariants> & { closeLabel?: string }

export function SheetContent({
  className,
  children,
  side,
  closeLabel,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: SheetContentProps) {
  const returnFocus = useReturnFocus({ onOpenAutoFocus, onCloseAutoFocus })
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay
        className={cn(
          'fixed inset-0 z-50 bg-ink/75',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        )}
      />
      <SheetPrimitive.Content className={cn(sheetVariants({ side }), className)} {...props} {...returnFocus}>
        {side === 'bottom' || side == null ? (
          <span aria-hidden="true" className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-pill bg-border-soft" />
        ) : null}
        {children}
        <DialogCloseButton label={closeLabel} className="absolute top-3 right-3" />
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

export function SheetHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 px-5 pt-4 pr-14', className)} {...props} />
}

export function SheetBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5', className)} {...props} />
}

export function SheetFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex gap-3 border-t border-border px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]', className)}
      {...props}
    />
  )
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn('text-lg font-bold text-foreground', className)} {...props} />
}

export function SheetDescription({ className, ...props }: ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn('text-[13px] text-text-secondary', className)} {...props} />
}
