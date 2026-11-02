import type { ComponentProps, Ref } from 'react'
import type { FormFieldControlProps } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ensSuffixSchema,
  NETWORK_LABEL,
  networkSchema,
  WALLET_PROVIDER_LABEL,
  walletProviderSchema,
  type Network,
  type WalletProvider,
} from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'

type EnsSuffix = (typeof ensSuffixSchema.options)[number]

type SelectFieldProps<TValue extends string> = FormFieldControlProps & {
  value: TValue | undefined
  onValueChange: (value: TValue) => void
  onBlur?: () => void
  ref?: Ref<HTMLButtonElement>
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function NetworkSelect({
  value,
  onValueChange,
  onBlur,
  ref,
  placeholder = 'Selecione uma rede',
  disabled,
  className,
  ...control
}: SelectFieldProps<Network>) {
  return (
    <Select value={value ?? ''} onValueChange={(next) => onValueChange(next as Network)} disabled={disabled}>
      <SelectTrigger ref={ref} onBlur={onBlur} className={className} {...control}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {networkSchema.options.map((network) => (
          <SelectItem key={network} value={network}>
            {NETWORK_LABEL[network]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function WalletProviderSelect({
  value,
  onValueChange,
  onBlur,
  ref,
  placeholder = 'Selecione uma carteira',
  disabled,
  className,
  ...control
}: SelectFieldProps<WalletProvider>) {
  return (
    <Select value={value ?? ''} onValueChange={(next) => onValueChange(next as WalletProvider)} disabled={disabled}>
      <SelectTrigger ref={ref} onBlur={onBlur} className={className} {...control}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {walletProviderSchema.options.map((provider) => (
          <SelectItem key={provider} value={provider}>
            {WALLET_PROVIDER_LABEL[provider]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

type EnsNameInputProps = FormFieldControlProps &
  Omit<ComponentProps<'input'>, 'id'> & {
    suffix: EnsSuffix | undefined
    onSuffixChange: (suffix: EnsSuffix) => void
    suffixDisabled?: boolean
  }

/** "Nome ENS": sufixo (.eth/.kurio) num select compacto ao lado do nome, como no Figma. */
export function EnsNameInput({ suffix, onSuffixChange, suffixDisabled, className, ...input }: EnsNameInputProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <Select value={suffix ?? '.eth'} onValueChange={(next) => onSuffixChange(next as EnsSuffix)} disabled={suffixDisabled}>
        <SelectTrigger size="compact" aria-label="Sufixo do nome ENS" className="shrink-0 md:h-[34px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ensSuffixSchema.options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input autoComplete="off" spellCheck={false} {...input} />
    </div>
  )
}

/**
 * Opção única que liga/desliga ("Usar outra carteira?", "Igual à carteira principal"). O Figma desenha
 * um rádio, mas um rádio sozinho não pode ser desmarcado; semanticamente é um checkbox com o visual do anel.
 */
export function RingCheckbox({
  label,
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'type'> & { label: string }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2.5 text-sm leading-5 text-foreground', props.disabled && 'cursor-not-allowed opacity-60', className)}>
      <input
        type="checkbox"
        className={cn(
          'peer size-4 shrink-0 cursor-pointer appearance-none rounded-full border-[1.5px] border-text-accent bg-transparent',
          'checked:bg-[radial-gradient(circle,var(--color-text-accent)_0_3.5px,transparent_4px)]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent',
          'disabled:cursor-not-allowed',
        )}
        {...props}
      />
      {label}
    </label>
  )
}
