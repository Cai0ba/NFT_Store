import { PackageX, RotateCcw, TrendingDown, TrendingUp, TriangleAlert, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/api/errors'
import { useRemoveCartItem, useUpdateCartItem, type CartChangeNotice } from '@/features/cart/hooks'
import { cn } from '@/shared/lib/cn'

const ICONS: Record<CartChangeNotice['kind'], ReactNode> = {
  'price-increased': <TrendingUp aria-hidden="true" className="size-4" />,
  'price-decreased': <TrendingDown aria-hidden="true" className="size-4" />,
  'availability-reduced': <TriangleAlert aria-hidden="true" className="size-4" />,
  'sold-out': <PackageX aria-hidden="true" className="size-4" />,
  'back-in-stock': <RotateCcw aria-hidden="true" className="size-4" />,
}

const TITLES: Record<CartChangeNotice['kind'], string> = {
  'price-increased': 'Preço alterado',
  'price-decreased': 'Preço alterado',
  'availability-reduced': 'Disponibilidade reduzida',
  'sold-out': 'Item esgotado',
  'back-in-stock': 'Disponível novamente',
}

type CartChangeNoticesProps = {
  notices: CartChangeNotice[]
  onDismiss: (id: string) => void
  className?: string
}

/**
 * Avisos de preço/estoque recebidos pelo socket enquanto o carrinho está aberto. O resumo já foi
 * recalculado pela API; aqui o colecionador entende o que mudou e decide (aceitar, ajustar, remover).
 */
export function CartChangeNotices({ notices, onDismiss, className }: CartChangeNoticesProps) {
  return (
    <div role="status" aria-label="Alterações nos itens do carrinho" className={cn(notices.length === 0 && 'sr-only', className)}>
      {notices.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {notices.map((notice) => (
            <NoticeItem key={notice.id} notice={notice} onDismiss={onDismiss} />
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function NoticeItem({ notice, onDismiss }: { notice: CartChangeNotice; onDismiss: (id: string) => void }) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const busy = update.isPending || remove.isPending

  const settle = (promise: Promise<unknown>, success: string) => {
    promise
      .then(() => {
        toast.success(success)
        onDismiss(notice.id)
      })
      .catch((error: unknown) => toast.error(getErrorMessage(error)))
  }

  // O PATCH com a mesma quantidade grava o preço atual como "aceito" no item.
  const acceptPrice = () =>
    settle(update.mutateAsync({ itemId: notice.itemId, quantity: notice.quantity, label: notice.name }), 'Novo preço aceito.')

  const adjustQuantity = () =>
    settle(
      update.mutateAsync({ itemId: notice.itemId, quantity: notice.available, label: notice.name }),
      `Quantidade ajustada para ${notice.available}.`,
    )

  const removeItem = () => settle(remove.mutateAsync({ itemId: notice.itemId, label: notice.name }), `${notice.name} removido.`)

  let action: ReactNode = null
  if (notice.kind === 'price-increased' || notice.kind === 'price-decreased') {
    action = (
      <Button size="sm" onClick={acceptPrice} loading={update.isPending} loadingLabel="Aceitando novo preço" disabled={busy}>
        Aceitar novo preço
      </Button>
    )
  } else if (notice.kind === 'availability-reduced' && notice.available > 0) {
    action = (
      <Button size="sm" onClick={adjustQuantity} loading={update.isPending} loadingLabel="Ajustando quantidade" disabled={busy}>
        Ajustar para {notice.available}
      </Button>
    )
  } else if (notice.kind === 'sold-out') {
    action = (
      <Button size="sm" variant="outline" onClick={removeItem} loading={remove.isPending} loadingLabel="Removendo item" disabled={busy}>
        Remover do carrinho
      </Button>
    )
  }

  const tone = notice.kind === 'price-decreased' || notice.kind === 'back-in-stock' ? 'text-success' : 'text-warning'

  return (
    <li className="flex flex-col gap-3 rounded-sm border border-border-soft border-l-4 border-l-warning bg-surface-card p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <span className={cn('mt-0.5 shrink-0', tone)}>{ICONS[notice.kind]}</span>
        <p className="min-w-0 text-sm leading-5">
          <strong className="font-bold text-foreground">{TITLES[notice.kind]}: </strong>
          <span className="text-text-secondary">{notice.message}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
        {action}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDismiss(notice.id)}
          disabled={busy}
          aria-label={`Dispensar aviso sobre ${notice.name}`}
          className="px-2"
        >
          <X aria-hidden="true" />
          <span aria-hidden="true" className="sm:sr-only">
            Dispensar
          </span>
        </Button>
      </div>
    </li>
  )
}
