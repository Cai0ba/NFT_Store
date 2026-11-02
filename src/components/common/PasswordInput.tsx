import { Eye, EyeOff } from 'lucide-react'
import { useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/shared/lib/cn'

export type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'> & {
  toggleLabel?: string
}

export function PasswordInput({ className, toggleLabel = 'Mostrar senha', disabled, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        disabled={disabled}
        className={cn('pr-12 md:pr-11', className)}
        {...props}
      />
      {/* Ícone segue o Figma: olho cortado enquanto a senha está oculta. */}
      <button
        type="button"
        aria-label={toggleLabel}
        aria-pressed={visible}
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
        className={cn(
          'absolute inset-y-0 right-1 my-auto inline-flex size-9 cursor-pointer items-center justify-center rounded-sm text-secondary',
          'hover:text-text-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-text-accent',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {visible ? <Eye aria-hidden="true" className="size-4" /> : <EyeOff aria-hidden="true" className="size-4" />}
      </button>
    </div>
  )
}
