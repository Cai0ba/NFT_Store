import { Link } from '@tanstack/react-router'
import { Check, Copy, ExternalLink, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { truncateAddress } from '@/components/common/EthAddress'
import { ThankYouEnvelopeIcon } from '@/components/common/icons'
import { NftImage } from '@/components/common/NftImage'
import { Button } from '@/components/ui/button'
import { NETWORK_LABEL, WALLET_PROVIDER_LABEL, type Network, type Order } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'
import { formatEth, formatEthForScreenReader, isZeroEth } from '@/shared/lib/money'

const EXPLORER_NAME: Record<Network, string> = {
  ethereum: 'Etherscan',
  polygon: 'Polygonscan',
  solana: 'Solscan',
}

/** "29 Jul, 2026", como no Figma. */
export function formatReceiptDate(iso: string) {
  const date = new Date(iso)
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '')
  return `${date.getDate()} ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${date.getFullYear()}`
}

/** Moldura do modal de confirmação: card centralizado, borda inferior laranja e "×" para o Início. */
export function ReceiptCard({ children, className, labelledBy }: { children: ReactNode; className?: string; labelledBy: string }) {
  return (
    <article
      aria-labelledby={labelledBy}
      className={cn(
        'relative mx-auto w-full max-w-[592px] border-b-[6px] border-b-primary bg-surface-card px-5 pt-6 pb-8 shadow-card sm:px-10',
        className,
      )}
    >
      <Link
        to="/"
        aria-label="Fechar e voltar ao início"
        className="absolute top-3 right-3 inline-flex size-9 items-center justify-center rounded-sm text-text-accent hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-text-accent"
      >
        <X aria-hidden="true" className="size-5" strokeWidth={1.5} />
      </Link>
      {children}
    </article>
  )
}

/** Recibo do pedido confirmado. Tudo vem do snapshot do pedido; nada é relido do catálogo. */
export function OrderReceipt({ order }: { order: Order }) {
  const [copied, setCopied] = useState(false)
  const transaction = order.transaction
  const explorer = EXPLORER_NAME[order.network]

  const copyHash = async () => {
    if (!transaction) return
    try {
      await navigator.clipboard.writeText(transaction.hash)
      setCopied(true)
      toast.success('ID da transação copiado.')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar. Selecione o ID manualmente.')
    }
  }

  return (
    <ReceiptCard labelledBy="receipt-title">
      <div className="flex flex-col items-center text-center">
        <ThankYouEnvelopeIcon width={72} height={63} />
        <h1 id="receipt-title" tabIndex={-1} className="mt-4 text-base leading-6 font-medium text-text-secondary outline-none">
          Seus NFTs agora estão na sua carteira
        </h1>
      </div>

      <dl className="-mx-5 mt-5 grid grid-cols-2 gap-y-3 border-y border-border-soft px-5 py-3 text-[13px] leading-5 sm:-mx-10 sm:grid-cols-[1.25fr_1fr_1fr_0.9fr] sm:px-10">
        <StripItem label="ID da transação">
          {transaction ? (
            <span className="inline-flex items-center gap-1">
              <span title={transaction.hash} translate="no">
                {truncateAddress(transaction.hash)}
              </span>
              <button
                type="button"
                onClick={() => void copyHash()}
                aria-label={copied ? 'ID da transação copiado' : 'Copiar ID da transação'}
                className="inline-flex size-6 cursor-pointer items-center justify-center rounded-xs text-text-accent hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-text-accent"
              >
                {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />}
              </button>
            </span>
          ) : (
            '—'
          )}
        </StripItem>
        <StripItem label="Data">
          <time dateTime={transaction?.confirmedAt ?? order.createdAt}>
            {formatReceiptDate(transaction?.confirmedAt ?? order.createdAt)}
          </time>
        </StripItem>
        <StripItem label="Total">
          <span aria-hidden="true">{formatEth(order.totalEth)}</span>
          <span className="sr-only">{formatEthForScreenReader(order.totalEth)}</span>
        </StripItem>
        <StripItem label="Carteira">{WALLET_PROVIDER_LABEL[order.wallet.provider]}</StripItem>
      </dl>

      <section aria-labelledby="receipt-details" className="mt-6">
        <h2 id="receipt-details" className="text-[15px] leading-6 font-bold text-foreground">
          Detalhes da transação
        </h2>
        <table className="mt-1 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border-soft text-sm leading-5 font-bold text-foreground">
              <th scope="col" className="py-1.5 font-bold">NFTs</th>
              <th scope="col" className="hidden py-1.5 text-center font-bold sm:table-cell">Edições</th>
              <th scope="col" className="py-1.5 text-right font-bold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.cartItemId}>
                <th scope="row" className="py-2.5 pr-2 font-normal">
                  <span className="flex min-w-0 items-center gap-3 max-sm:max-w-[11rem]">
                    <NftImage artwork={item.artwork} alt="" sizes="70px" className="size-14 shrink-0 rounded-md sm:size-[70px]" />
                    <span className="min-w-0">
                      <span className="block text-sm leading-5 font-bold break-words text-foreground sm:truncate sm:text-[15px]">{item.name}</span>
                      <span className="block text-[13px] leading-5 text-text-secondary sm:truncate">ID do token: {item.tokenId}</span>
                      <span className="block text-[13px] leading-5 text-text-secondary sm:hidden">Edições: x {item.quantity}</span>
                    </span>
                  </span>
                </th>
                <td className="hidden py-2.5 text-center text-[13px] whitespace-nowrap text-text-secondary tabular-nums sm:table-cell">
                  <span aria-hidden="true">(x {item.quantity})</span>
                  <span className="sr-only">{item.quantity} {item.quantity === 1 ? 'unidade' : 'unidades'}, edição {item.editionLabel}</span>
                </td>
                <td className="py-2.5 text-right text-base font-bold whitespace-nowrap text-text-accent tabular-nums">
                  <span aria-hidden="true">{formatEth(item.lineTotalEth)}</span>
                  <span className="sr-only">{formatEthForScreenReader(item.lineTotalEth)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-1 ml-auto grid w-full max-w-[21rem] grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-[15px] leading-6">
          {!isZeroEth(order.discountEth) ? (
            <>
              <dt className="text-foreground">Desconto{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
              <dd className="text-right text-foreground tabular-nums">(-) {formatEth(order.discountEth)}</dd>
            </>
          ) : null}
          <dt className="text-foreground">Taxa de rede</dt>
          <dd className="text-right text-foreground tabular-nums">{formatEth(order.networkFeeEth)}</dd>
          <dt className="border-t border-border-soft pt-1 font-bold text-foreground">Total</dt>
          <dd className="border-t border-border-soft pt-1 text-right text-lg font-bold text-text-accent tabular-nums">
            {formatEth(order.totalEth)}
          </dd>
        </dl>
      </section>

      <p className="-mx-5 mt-4 border-t border-border-soft px-5 pt-4 text-center text-sm leading-6 text-text-secondary sm:-mx-10 sm:px-10">
        Transação confirmada na {NETWORK_LABEL[order.network]}. A propriedade foi transferida para sua carteira conectada (
        <span title={order.wallet.address}>{truncateAddress(order.wallet.address)}</span>) e registrada na rede.
      </p>

      <div className="mt-5 flex justify-center">
        {transaction ? (
          <Button asChild>
            <a
              href={transaction.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={`Explorador simulado (demonstração): abre o ${explorer} de mentira em nova aba`}
            >
              Ver no {explorer}
              <ExternalLink aria-hidden="true" />
              <span className="sr-only"> (explorador simulado de demonstração, abre em nova aba)</span>
            </a>
          </Button>
        ) : null}
      </div>
    </ReceiptCard>
  )
}

function StripItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 pr-3 even:border-l even:border-border-soft even:pl-3 sm:border-l sm:border-border-soft sm:px-3 sm:first:border-l-0 sm:first:pl-0">
      <dt className="font-bold text-foreground">{label}</dt>
      <dd className="truncate text-text-secondary tabular-nums">{children}</dd>
    </div>
  )
}
