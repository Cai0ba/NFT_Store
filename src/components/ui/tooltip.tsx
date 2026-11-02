import { Tooltip as TooltipPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

export function TooltipProvider({ delayDuration = 250, ...props }: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />
}

export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

export function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 max-w-64 rounded-sm border border-border-soft bg-surface-raised px-2.5 py-1.5 text-xs leading-4 text-foreground shadow-card',
          'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-surface-raised" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

/** Atalho para o caso comum: um gatilho e um texto curto. Requer `TooltipProvider` acima na árvore. */
export function SimpleTooltip({
  content,
  children,
  side,
}: {
  content: string
  children: React.ReactElement
  side?: ComponentProps<typeof TooltipPrimitive.Content>['side']
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{content}</TooltipContent>
    </Tooltip>
  )
}
