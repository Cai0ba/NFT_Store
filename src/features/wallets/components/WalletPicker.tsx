import { Link } from '@tanstack/react-router'
import { Copy, EllipsisVertical, Link2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { truncateAddress } from '@/components/common/EthAddress'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { NETWORK_LABEL, type Wallet } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'

type WalletPickerProps = {
  wallets: Wallet[]
  value: string | undefined
  onValueChange: (walletId: string) => void
  connectedWalletId?: string | null
  labelledBy: string
  disabled?: boolean
  className?: string
}

export const walletNetworkLabel = (wallet: Wallet) =>
  wallet.slot === 'primary' ? `Rede principal ${NETWORK_LABEL[wallet.network]}` : `Rede ${NETWORK_LABEL[wallet.network]}`

async function copyAddress(address: string) {
  try {
    await navigator.clipboard.writeText(address)
    toast.success('Endereço copiado.')
  } catch {
    toast.error('Não foi possível copiar. Selecione o endereço manualmente.')
  }
}

/** Carteiras cadastradas no perfil, como cards de rádio ("Carteira conectada" no mobile). */
export function WalletPicker({ wallets, value, onValueChange, connectedWalletId, labelledBy, disabled, className }: WalletPickerProps) {
  return (
    <RadioGroup
      value={value ?? ''}
      onValueChange={onValueChange}
      aria-labelledby={labelledBy}
      disabled={disabled}
      className={cn('gap-4 md:gap-3', className)}
    >
      {wallets.map((wallet) => {
        const itemId = `wallet-option-${wallet.id}`
        const selected = wallet.id === value
        const connected = wallet.id === connectedWalletId
        return (
          <div
            key={wallet.id}
            className={cn(
              'relative flex items-center gap-4 rounded-[14px] border bg-surface-card py-3.5 pr-2 pl-5 transition-colors md:rounded-sm md:py-3',
              selected ? 'border-primary' : 'border-transparent md:border-border',
            )}
          >
            <RadioGroupItem id={itemId} value={wallet.id} aria-describedby={`${itemId}-desc`} />
            <label htmlFor={itemId} className="min-w-0 flex-1 cursor-pointer">
              <span className="flex items-center gap-2">
                <span className="text-base leading-6 font-bold text-foreground">{wallet.nickname}</span>
                {connected ? (
                  <span className="inline-flex items-center gap-1 rounded-pill border border-success/50 px-2 text-[11px] leading-5 text-success">
                    <Link2 aria-hidden="true" className="size-3" />
                    Conectada
                  </span>
                ) : null}
              </span>
              <span id={`${itemId}-desc`} className="block text-sm leading-6 text-text-secondary">
                <span className="block truncate" title={wallet.address}>
                  {wallet.ensOrSecondary || truncateAddress(wallet.address)}
                </span>
                <span className="block">{walletNetworkLabel(wallet)}</span>
              </span>
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Opções da carteira ${wallet.nickname}`}
                className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-sm text-foreground hover:bg-surface-raised hover:text-text-accent focus-visible:outline-2 focus-visible:outline-text-accent"
              >
                <EllipsisVertical aria-hidden="true" className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => void copyAddress(wallet.address)}>
                  <Copy aria-hidden="true" />
                  Copiar endereço
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/perfil/carteiras">
                    <Pencil aria-hidden="true" />
                    Editar em Carteiras
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      })}
    </RadioGroup>
  )
}
