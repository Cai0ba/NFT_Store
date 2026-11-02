import { CircleAlert } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/shared/lib/cn'

export type FormFieldControlProps = {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
  'aria-required'?: true
}

export type FormFieldProps = {
  label: ReactNode
  /** Recebe as props de acessibilidade para espalhar no controle: `{(field) => <Input {...field} {...register('email')} />}`. */
  children: (control: FormFieldControlProps) => ReactNode
  id?: string
  required?: boolean
  error?: string
  hint?: ReactNode
  hideLabel?: boolean
  className?: string
}

export function FormField({ label, children, id, required = false, error, hint, hideLabel = false, className }: FormFieldProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <Label htmlFor={controlId} className={cn(hideLabel && 'sr-only')}>
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="text-lg leading-none text-text-accent">
              *
            </span>
            <span className="sr-only"> (obrigatório)</span>
          </>
        ) : null}
      </Label>
      {children({
        id: controlId,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        'aria-required': required ? true : undefined,
      })}
      {hint ? (
        <p id={hintId} className="text-xs leading-4 text-text-secondary">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-xs leading-4 text-danger">
          <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  )
}
