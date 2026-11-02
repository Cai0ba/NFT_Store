import { Copy } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { truncateAddress } from '@/components/common/EthAddress'
import { NETWORK_LABEL, WALLET_PROVIDER_LABEL, type Wallet } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs leading-5 text-text-secondary">{label}</dt>
      <dd className="truncate text-sm leading-6 text-foreground">{children}</dd>
    </div>
  )
}

/** Modo visualização da carteira cadastrada. */
export function WalletSummary({ wallet, className }: { wallet: Wallet; className?: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(wallet.address)
      toast.success('Endereço copiado.')
    } catch {
      toast.error('Não foi possível copiar. Selecione o endereço manualmente.')
    }
  }

  return (
    <div className={cn('rounded-sm border border-border bg-surface-card p-4 md:p-5', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-base leading-6 font-bold text-foreground">{wallet.nickname}</p>
        <p className="text-sm text-text-accent">
          {WALLET_PROVIDER_LABEL[wallet.provider]} · {NETWORK_LABEL[wallet.network]}
        </p>
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <Item label="Endereço">
          <span className="inline-flex items-center gap-1">
            <span title={wallet.address} translate="no">
              {truncateAddress(wallet.address, 8, 6)}
            </span>
            <button
              type="button"
              onClick={() => void copy()}
              aria-label={`Copiar endereço da carteira ${wallet.nickname}`}
              className="inline-flex size-6 cursor-pointer items-center justify-center rounded-xs text-text-accent hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-text-accent"
            >
              <Copy aria-hidden="true" className="size-3.5" />
            </button>
          </span>
        </Item>
        <Item label="Nome ENS">
          {wallet.ensName}
          {wallet.ensSuffix}
        </Item>
        <Item label="Nome de exibição">{wallet.displayName}</Item>
        <Item label="Nome do perfil">{wallet.profileName}</Item>
        <Item label="E-mail">{wallet.email}</Item>
        <Item label="Código de indicação">{wallet.referralCode}</Item>
        {wallet.ensOrSecondary ? <Item label="ENS ou carteira secundária">{wallet.ensOrSecondary}</Item> : null}
      </dl>
    </div>
  )
}
