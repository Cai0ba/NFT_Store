import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'
import { fieldBaseClass } from './input'

export function Textarea({ className, rows = 4, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      rows={rows}
      className={cn(fieldBaseClass, 'min-h-24 resize-y py-3 leading-6', className)}
      {...props}
    />
  )
}
