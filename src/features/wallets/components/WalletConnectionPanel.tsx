import { CircleAlert, CircleCheck, PlugZap, Unplug } from 'lucide-react'
import type { Ref } from 'react'
import { truncateAddress } from '@/components/common/EthAddress'
import { Button } from '@/components/ui/button'
import { SpinnerIcon } from '@/components/ui/spinner'
import { getErrorMessage } from '@/api/errors'
import { useWalletConnection } from '@/features/wallets/hooks'
import { NETWORK_LABEL, WALLET_PROVIDER_LABEL, type Network, type Wallet, type WalletProvider } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'

type WalletConnectionPanelProps = {
  wallet: Wallet | null
  network: Network | undefined
  provider: WalletProvider | undefined
  /** Mensagem quando o colecionador tenta confirmar sem conectar. */
  requirementError?: string
  connectButtonRef?: Ref<HTMLButtonElement>
  disabled?: boolean
  className?: string
}

/** A carteira está pronta quando a conexão ativa é desta carteira e desta rede. */
export function useIsWalletReady(walletId: string | undefined, network: Network | undefined) {
  const { connection, status } = useWalletConnection()
  return status === 'connected' && connection?.walletId === walletId && connection?.network === network
}

/** Conexão simulada com a extensão: conectar, recusa (cenário wallet-rejects) e desconectar. */
export function WalletConnectionPanel({
  wallet,
  network,
  provider,
  requirementError,
  connectButtonRef,
  disabled = false,
  className,
}: WalletConnectionPanelProps) {
  const { connection, status, error, isDisconnecting, connect, disconnect } = useWalletConnection()
  const providerLabel = WALLET_PROVIDER_LABEL[provider ?? wallet?.provider ?? 'metamask']
  const ready = status === 'connected' && connection?.walletId === wallet?.id && connection?.network === network
  const connectedElsewhere = status === 'connected' && connection && !ready

  const handleConnect = () => {
    if (!wallet || !network) return
    void connect(wallet.id, network)
  }

  if (!wallet || !network) {
    return (
      <p className={cn('text-sm leading-5 text-text-secondary', className)}>
        Escolha uma carteira e uma rede para conectar.
      </p>
    )
  }

  return (
    <div className={cn('flex flex-col gap-3 rounded-sm border border-border bg-surface-card p-4', className)}>
      {ready && connection ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex min-w-0 items-start gap-2 text-sm leading-5">
            <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
            <span className="min-w-0">
              <span className="font-bold text-foreground">Carteira conectada</span>
              <span className="block text-text-secondary">
                {wallet.nickname} · <span title={wallet.address}>{truncateAddress(wallet.address)}</span> · {NETWORK_LABEL[connection.network]}
              </span>
            </span>
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void disconnect()}
            loading={isDisconnecting}
            loadingLabel="Desconectando"
            disabled={disabled}
          >
            {isDisconnecting ? null : <Unplug aria-hidden="true" />}
            Desconectar
          </Button>
        </div>
      ) : (
        <>
          {status === 'rejected' ? (
            <p role="alert" className="flex items-start gap-2 text-sm leading-5 text-danger">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>
                {error ? getErrorMessage(error) : 'A conexão foi recusada na carteira.'} Abra a extensão e autorize para continuar.
              </span>
            </p>
          ) : status === 'connecting' ? (
            <p className="flex items-center gap-2 text-sm leading-5 text-text-secondary">
              <SpinnerIcon className="text-text-accent" />
              Aguardando autorização no {providerLabel}…
            </p>
          ) : connectedElsewhere ? (
            <p className="text-sm leading-5 text-text-secondary">
              A conexão atual é de outra carteira ou rede ({NETWORK_LABEL[connection.network]}). Conecte {wallet.nickname} na rede{' '}
              {NETWORK_LABEL[network]} para pagar.
            </p>
          ) : (
            <p className="text-sm leading-5 text-text-secondary">
              Conecte {wallet.nickname} ({truncateAddress(wallet.address)}) na rede {NETWORK_LABEL[network]} para autorizar o pagamento.
            </p>
          )}
          {status === 'disconnected' && error ? (
            <p role="alert" className="flex items-start gap-2 text-sm leading-5 text-danger">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {getErrorMessage(error)}
            </p>
          ) : null}
          <Button
            ref={connectButtonRef}
            variant={status === 'rejected' ? 'primary' : 'outline'}
            onClick={handleConnect}
            loading={status === 'connecting'}
            loadingLabel="Conectando carteira"
            disabled={disabled}
            aria-describedby={requirementError ? 'wallet-requirement-error' : undefined}
            className="w-full"
          >
            {status === 'connecting' ? null : <PlugZap aria-hidden="true" />}
            {status === 'rejected' ? 'Tentar de novo' : `Conectar com ${providerLabel}`}
          </Button>
          {requirementError ? (
            <p id="wallet-requirement-error" className="flex items-start gap-1.5 text-xs leading-4 text-danger">
              <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
              {requirementError}
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
