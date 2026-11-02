import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

/**
 * Campos do Figma: 42px e raio 4 no desktop; 48px e raio 10 no mobile.
 * No mobile o texto fica em 16px para o iOS não dar zoom ao focar.
 */
export const fieldBaseClass = cn(
  'w-full min-w-0 border border-field-border bg-ink font-mono text-foreground',
  'rounded-md px-4 text-base md:rounded-xs md:px-3.5 md:text-sm',
  'placeholder:text-secondary md:placeholder:text-[13px]',
  'transition-[border-color,box-shadow] duration-150',
  'hover:border-secondary',
  'focus-visible:border-text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text-accent',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'aria-invalid:border-danger aria-invalid:focus-visible:ring-danger',
)

export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return <input type={type} className={cn(fieldBaseClass, 'h-12 md:h-[42px]', className)} {...props} />
}
