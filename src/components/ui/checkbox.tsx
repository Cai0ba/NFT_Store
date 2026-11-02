import { Check } from 'lucide-react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'peer inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-xs border border-text-accent bg-transparent',
        'transition-colors data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent',
        'disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <Check aria-hidden="true" strokeWidth={3} className="size-3" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
