import { Tabs as TabsPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

export const Tabs = TabsPrimitive.Root

export function TabsList({
  className,
  bordered = false,
  ...props
}: ComponentProps<typeof TabsPrimitive.List> & {
  /** Linha divisória sob toda a lista, como nas abas do detalhe do NFT. */
  bordered?: boolean
}) {
  return (
    <TabsPrimitive.List
      className={cn(
        'flex items-end gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        bordered && 'border-b border-border',
        className,
      )}
      {...props}
    />
  )
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center pb-1.5 font-mono text-[15px] leading-5 font-medium whitespace-nowrap text-foreground',
        'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-pill after:bg-transparent',
        'hover:text-text-accent',
        'data-[state=active]:text-text-accent data-[state=active]:after:bg-text-accent',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-text-accent', className)}
      {...props}
    />
  )
}
