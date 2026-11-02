import { Wallet as WalletIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { WALLET_PROVIDER_LABEL, type WalletProvider } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'

const PROVIDERS: WalletProvider[] = ['walletconnect', 'metamask', 'coinbase']

const PROVIDER_MARK: Record<WalletProvider, ReactNode> = {
  walletconnect: 'W',
  metamask: 'M',
  coinbase: <WalletIcon className="size-4" />,
}

type ProviderPickerProps = {
  value: WalletProvider | undefined
  onValueChange: (provider: WalletProvider) => void
  labelledBy: string
  disabled?: boolean
  className?: string
}

/** Provedor usado na conexão simulada (WalletConnect, MetaMask, Coinbase Wallet). */
export function ProviderPicker({ value, onValueChange, labelledBy, disabled, className }: ProviderPickerProps) {
  return (
    <RadioGroup
      value={value ?? ''}
      onValueChange={(next) => onValueChange(next as WalletProvider)}
      aria-labelledby={labelledBy}
      disabled={disabled}
      className={cn('gap-4 md:gap-3', className)}
    >
      {PROVIDERS.map((provider) => {
        const id = `provider-option-${provider}`
        const selected = provider === value
        return (
          <div
            key={provider}
            className={cn(
              'flex min-h-16 items-center gap-4 rounded-[14px] border bg-surface-card px-4 md:min-h-[46px] md:rounded-sm md:bg-transparent md:py-2',
              selected ? 'border-primary' : 'border-transparent md:border-border',
            )}
          >
            <RadioGroupItem id={id} value={provider} className="order-last md:order-first" />
            <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer items-center gap-4">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-sm font-bold text-text-accent md:hidden"
              >
                {PROVIDER_MARK[provider]}
              </span>
              <span className="text-[15px] leading-6 text-foreground">{WALLET_PROVIDER_LABEL[provider]}</span>
            </label>
          </div>
        )
      })}
    </RadioGroup>
  )
}
