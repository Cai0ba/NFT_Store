import { createFileRoute, Link } from '@tanstack/react-router'
import { CircleX, FileQuestion, RotateCw } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { ErrorState } from '@/components/common/ErrorState'
import { pageTitle } from '@/components/layout/page-title'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SpinnerIcon } from '@/components/ui/spinner'
import { getErrorMessage, hasErrorCode } from '@/api/errors'
import { requireAuth } from '@/features/auth/guard'
import { OrderReceipt, ReceiptCard } from '@/features/orders/components/OrderReceipt'
import { useOrder } from '@/features/orders/hooks'

export const Route = createFileRoute('/pedido/$orderId')({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: pageTitle('Pedido') }] }),
  component: OrderPage,
})

const headingClass = 'mt-4 text-lg leading-6 font-bold text-foreground outline-none'

function OrderPage() {
  const { orderId } = Route.useParams()
  const order = useOrder(orderId)
  const status = order.data?.status
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Pendente -> confirmado/recusado troca a tela inteira; o foco acompanha o novo título.
  const previousStatus = useRef(status)
  useEffect(() => {
    if (previousStatus.current === 'pending' && status && status !== 'pending') {
      const target = headingRef.current ?? document.getElementById('receipt-title')
      target?.focus()
    }
    previousStatus.current = status
  }, [status])

  let content
  if (order.isPending) {
    content = <ReceiptSkeleton />
  } else if (hasErrorCode(order.error, 'NOT_FOUND', 'FORBIDDEN')) {
    content = (
      <ReceiptCard labelledBy="order-missing-title">
        <div className="flex flex-col items-center py-6 text-center">
          <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-surface-raised text-text-accent">
            <FileQuestion className="size-7" />
          </span>
          <h1 id="order-missing-title" className={headingClass}>
            Pedido não encontrado
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-text-secondary">
            Este pedido não existe ou pertence a outra conta. Confira o endereço ou volte ao mercado.
          </p>
          <Button asChild className="mt-6">
            <Link to="/" hash="catalogo">
              Explorar o mercado
            </Link>
          </Button>
        </div>
      </ReceiptCard>
    )
  } else if (order.isError || !order.data) {
    content = (
      <ErrorState
        title="Não foi possível carregar o pedido"
        description={getErrorMessage(order.error)}
        onRetry={() => void order.refetch()}
        retrying={order.isFetching}
        headingLevel="h2"
      />
    )
  } else if (order.data.status === 'pending') {
    content = (
      <ReceiptCard labelledBy="order-pending-title">
        <div role="status" className="flex flex-col items-center py-8 text-center">
          <SpinnerIcon className="size-12 text-text-accent" />
          <h1 id="order-pending-title" className={headingClass}>
            Aguardando confirmação da rede…
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-text-secondary">
            O pagamento do pedido {order.data.id} está sendo processado. Esta página atualiza sozinha; é seguro recarregar ou
            voltar depois.
          </p>
        </div>
      </ReceiptCard>
    )
  } else if (order.data.status === 'rejected') {
    content = (
      <ReceiptCard labelledBy="order-rejected-title">
        <div role="alert" className="flex flex-col items-center py-6 text-center">
          <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-full bg-surface-raised text-danger">
            <CircleX className="size-7" />
          </span>
          <h1 ref={headingRef} tabIndex={-1} id="order-rejected-title" className={headingClass}>
            Pagamento recusado
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-text-secondary">
            {order.data.failureReason ?? 'A rede recusou a transação.'} Nada foi cobrado e os itens continuam no seu carrinho.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
            <Button asChild variant="outline">
              <Link to="/carrinho">Voltar ao carrinho</Link>
            </Button>
            <Button asChild>
              <Link to="/pagamento">
                <RotateCw aria-hidden="true" />
                Tentar novamente
              </Link>
            </Button>
          </div>
        </div>
      </ReceiptCard>
    )
  } else {
    content = <OrderReceipt order={order.data} />
  }

  return <div className="container-page py-8 md:py-16">{content}</div>
}

function ReceiptSkeleton() {
  return (
    <div aria-busy="true" className="mx-auto w-full max-w-[592px] border-b-[6px] border-b-primary bg-surface-card px-5 pt-6 pb-8 sm:px-10">
      <span role="status" className="sr-only">
        Carregando pedido
      </span>
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-[63px] w-[72px]" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      <Skeleton className="mt-6 h-12" />
      <Skeleton className="mt-6 h-5 w-48" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="mt-3 h-[70px]" />
      ))}
      <Skeleton className="mx-auto mt-8 h-[42px] w-44" />
    </div>
  )
}
