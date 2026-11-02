import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

export function RadioGroup({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root className={cn('grid gap-3', className)} {...props} />
}

/** Anel laranja do Figma ("Usar outra carteira?", lista de carteiras); o miolo preenchido marca a seleção. */
export function RadioGroupItem({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        'peer inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-text-accent bg-transparent',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent',
        'disabled:cursor-not-allowed disabled:border-border-soft disabled:opacity-60',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="block size-2 rounded-full bg-text-accent" />
    </RadioGroupPrimitive.Item>
  )
}
