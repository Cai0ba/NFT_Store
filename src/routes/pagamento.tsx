import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ChevronDown, ShoppingCart, WalletCards } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useForm, useWatch } from 'react-hook-form'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { MobileScreenHeader } from '@/components/layout/MobileScreenHeader'
import { pageTitle } from '@/components/layout/page-title'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { applyFieldErrors, getErrorMessage } from '@/api/errors'
import { requireAuth } from '@/features/auth/guard'
import { CouponForm } from '@/features/cart/components/CouponForm'
import { OrderSummary } from '@/features/cart/components/OrderSummary'
import { useCart, useCartQuote } from '@/features/cart/hooks'
import { CheckoutDialog } from '@/features/checkout/components/CheckoutDialog'
import { CheckoutItems } from '@/features/checkout/components/CheckoutItems'
import { CollectorFields, type CollectorFormInput } from '@/features/checkout/components/CollectorFields'
import { useCheckoutDraft, type CheckoutDraft } from '@/features/checkout/draft'
import { useCheckout, type UseCheckoutResult } from '@/features/checkout/use-checkout'
import { useProfile } from '@/features/profile/hooks'
import { ProviderPicker } from '@/features/wallets/components/ProviderPicker'
import { useIsWalletReady, WalletConnectionPanel } from '@/features/wallets/components/WalletConnectionPanel'
import { WalletPicker } from '@/features/wallets/components/WalletPicker'
import { useWallets } from '@/features/wallets/hooks'
import {
  collectorInfoSchema,
  type Cart,
  type CollectorInfo,
  type Profile,
  type Wallet,
  type WalletsResponse,
} from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'
import { formatEth, formatEthForScreenReader } from '@/shared/lib/money'

export const Route = createFileRoute('/pagamento')({
  beforeLoad: requireAuth,
  head: () => ({ meta: [{ title: pageTitle('Pagamento') }] }),
  component: PaymentPage,
})

const BREADCRUMB_ITEMS = [
  { label: 'Início', href: '/' },
  { label: 'Mercado', href: '/#catalogo' },
  { label: 'Pagamento' },
]

function PaymentPage() {
  const checkout = useCheckout()
  const cart = useCart()
  const profile = useProfile()
  const wallets = useWallets()
  const navigate = useNavigate()
  const { orderId, phase } = checkout

  useEffect(() => {
    if (phase === 'confirmed' && orderId) void navigate({ to: '/pedido/$orderId', params: { orderId }, replace: true })
  }, [phase, orderId, navigate])

  const failed = [cart, profile, wallets].find((query) => query.isError)
  let content
  if (failed) {
    content = (
      <ErrorState
        className="mt-6"
        title="Não foi possível carregar o pagamento"
        description={getErrorMessage(failed.error)}
        onRetry={() => [cart, profile, wallets].forEach((query) => query.isError && void query.refetch())}
        retrying={failed.isFetching}
      />
    )
  } else if (!cart.data || !profile.data || !wallets.data) {
    content = <PaymentSkeleton />
  } else if (cart.data.items.length === 0 && phase === 'editing') {
    content = (
      <EmptyState
        className="mt-6"
        icon={<ShoppingCart />}
        title="Seu carrinho está vazio"
        description="Adicione NFTs ao carrinho para finalizar uma compra."
        action={
          <Button asChild>
            <Link to="/" hash="catalogo">
              Explorar o mercado
            </Link>
          </Button>
        }
      />
    )
  } else {
    content = <CheckoutForm checkout={checkout} cart={cart.data} profile={profile.data} wallets={wallets.data} />
  }

  return (
    <div className="container-page pt-4 pb-16 md:pt-6 md:pb-24">
      <MobileScreenHeader title="Pagamento com carteira" backTo="/carrinho" />
      <h1 className="sr-only hidden md:block">Pagamento</h1>
      <Breadcrumbs
        items={BREADCRUMB_ITEMS}
        className="hidden md:block"
        renderLink={(item, props) =>
          item.href === '/#catalogo' ? (
            <Link to="/" hash="catalogo" className={props.className}>
              {props.children}
            </Link>
          ) : (
            <Link to="/" className={props.className}>
              {props.children}
            </Link>
          )
        }
      />
      {content}
    </div>
  )
}

function walletList(wallets: WalletsResponse): Wallet[] {
  return [wallets.primary, wallets.secondary].filter((wallet): wallet is Wallet => wallet !== null)
}

/** Rascunho primeiro (o que o colecionador já digitou), depois perfil e carteira escolhida. */
function initialValues(profile: Profile, wallet: Wallet | null, draft: CheckoutDraft | null): CollectorFormInput {
  const saved = draft?.collector ?? {}
  return {
    displayName: saved.displayName ?? profile.displayName,
    username: saved.username ?? profile.username,
    network: saved.network ?? wallet?.network ?? 'ethereum',
    profileName: saved.profileName ?? wallet?.profileName ?? profile.username,
    walletAddress: saved.walletAddress ?? wallet?.address ?? '',
    ensOrSecondary: saved.ensOrSecondary ?? wallet?.ensOrSecondary ?? '',
    walletProvider: saved.walletProvider ?? wallet?.provider ?? 'metamask',
    referralCode: saved.referralCode ?? wallet?.referralCode ?? '',
    email: saved.email ?? profile.email,
    ensName: saved.ensName ?? (profile.ensName || wallet?.ensName || ''),
    ensSuffix: saved.ensSuffix ?? profile.ensSuffix,
    useOtherWallet: saved.useOtherWallet ?? false,
    note: saved.note ?? '',
  }
}

type CheckoutFormProps = {
  checkout: UseCheckoutResult
  cart: Cart
  profile: Profile
  wallets: WalletsResponse
}

function CheckoutForm({ checkout, cart, profile, wallets }: CheckoutFormProps) {
  const { draft, save } = useCheckoutDraft()
  const available = useMemo(() => walletList(wallets), [wallets])
  const [walletId, setWalletId] = useState<string | undefined>(() =>
    available.some((wallet) => wallet.id === draft?.walletId) ? draft?.walletId : available[0]?.id,
  )
  const selectedWallet = available.find((wallet) => wallet.id === walletId) ?? null

  const form = useForm<CollectorFormInput, unknown, CollectorInfo>({
    resolver: zodResolver(collectorInfoSchema),
    defaultValues: initialValues(profile, selectedWallet, draft),
    mode: 'onTouched',
  })
  const { control, setValue, getValues } = form
  const network = useWatch({ control, name: 'network' })
  const provider = useWatch({ control, name: 'walletProvider' })
  const useOtherWallet = useWatch({ control, name: 'useOtherWallet' })
  const [displayName, email] = useWatch({ control, name: ['displayName', 'email'] })

  const quote = useCartQuote(network ?? 'ethereum')
  const walletReady = useIsWalletReady(walletId, network)
  const [triedWithoutWallet, setTriedWithoutWallet] = useState(false)
  const [collectorOpen, setCollectorOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [couponOpen, setCouponOpen] = useState(false)
  const connectButtonRef = useRef<HTMLButtonElement>(null)

  // Rascunho salvo a cada mudança: sobrevive a refresh e à expiração da sessão no meio do checkout.
  useEffect(() => {
    return form.subscribe({
      formState: { values: true },
      callback: ({ values }) => save({ collector: values as Partial<CollectorInfo>, walletId, network: values.network }),
    })
  }, [form, save, walletId])

  // Sem "Usar outra carteira?", o endereço de recebimento é o da carteira escolhida.
  useEffect(() => {
    if (!useOtherWallet && selectedWallet && getValues('walletAddress') !== selectedWallet.address) {
      setValue('walletAddress', selectedWallet.address, { shouldValidate: form.formState.isSubmitted })
    }
  }, [useOtherWallet, selectedWallet, getValues, setValue, form.formState.isSubmitted])

  const { phase, error, backToEdit } = checkout
  useEffect(() => {
    if (phase === 'error' && error?.code === 'VALIDATION_ERROR' && error.fieldErrors) {
      backToEdit()
      applyFieldErrors(error, form.setError)
    }
  }, [phase, error, backToEdit, form.setError])

  const selectWallet = (id: string) => {
    const wallet = available.find((item) => item.id === id)
    setWalletId(id)
    if (!wallet) return
    const options = { shouldDirty: true, shouldValidate: form.formState.isSubmitted }
    setValue('network', wallet.network, options)
    setValue('walletProvider', wallet.provider, options)
    if (!getValues('useOtherWallet')) {
      setValue('walletAddress', wallet.address, options)
      setValue('ensOrSecondary', wallet.ensOrSecondary ?? '', options)
    }
    save({ collector: getValues() as Partial<CollectorInfo>, walletId: id, network: wallet.network })
  }

  const onValid = async (values: CollectorInfo) => {
    if (!selectedWallet || !walletReady) {
      setTriedWithoutWallet(true)
      if (selectedWallet) connectButtonRef.current?.focus()
      return
    }
    await checkout.review(values, selectedWallet.id, values.network)
  }

  // No mobile o formulário fica recolhido; abre antes de o react-hook-form focar o primeiro erro.
  const onInvalid = () => flushSync(() => setCollectorOpen(true))

  const retryAfterRejection = useCallback(() => {
    const input = checkout.input
    if (input) void checkout.review(input.collector, input.walletId, input.network)
    else checkout.backToEdit()
  }, [checkout])

  const busy = checkout.isBusy || checkout.phase === 'pending'
  const walletRequirement = triedWithoutWallet && !walletReady
    ? selectedWallet
      ? 'Conecte a carteira na rede escolhida antes de confirmar.'
      : 'Cadastre uma carteira para concluir a compra.'
    : undefined
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  const errorCount = Object.keys(form.formState.errors).length
  const collectorExpanded = collectorOpen || errorCount > 0

  return (
    <>
      <form
        noValidate
        aria-label="Pagamento"
        onSubmit={(event) => void form.handleSubmit(onValid, onInvalid)(event)}
        className="mt-6 flex flex-col gap-8 md:mt-[22px] lg:grid lg:grid-cols-[minmax(0,1fr)_405px] lg:items-start lg:gap-x-8 lg:gap-y-6"
      >
        <section aria-labelledby="collector-title" className="order-2 min-w-0 md:order-1 lg:col-start-1 lg:row-span-3 lg:row-start-1">
          <h2 id="collector-title" className="hidden text-base leading-6 font-bold text-foreground md:block">
            Perfil do colecionador
          </h2>
          <h2 className="md:hidden">
            <button
              type="button"
              aria-expanded={collectorExpanded}
              aria-controls="collector-fields"
              onClick={() => setCollectorOpen(!collectorExpanded)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-[14px] bg-surface-card px-5 py-4 text-left focus-visible:outline-2 focus-visible:outline-text-accent"
            >
              <span>
                <span className="block text-base leading-6 font-bold text-foreground">Dados do colecionador</span>
                <span className={cn('block text-sm leading-5', errorCount > 0 ? 'text-danger' : 'text-text-secondary')}>
                  {errorCount > 0 ? `${errorCount} ${errorCount === 1 ? 'campo precisa' : 'campos precisam'} de atenção` : [displayName, email].filter(Boolean).join(' · ') || 'Preencha seus dados'}
                </span>
              </span>
              <ChevronDown aria-hidden="true" className={cn('size-5 shrink-0 text-text-accent transition-transform', collectorExpanded && 'rotate-180')} />
            </button>
          </h2>
          <div id="collector-fields" className={cn('mt-5 md:mt-[22px] md:block', collectorExpanded ? 'block' : 'hidden')}>
            <CollectorFields form={form} addressLocked={!useOtherWallet && selectedWallet !== null} disabled={busy} />
          </div>
        </section>

        <div className="order-3 min-w-0 md:order-2 lg:col-start-2 lg:row-start-1">
          <button
            type="button"
            aria-expanded={summaryOpen}
            aria-controls="checkout-summary"
            onClick={() => setSummaryOpen((open) => !open)}
            className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-[14px] bg-surface-card px-5 py-4 text-left focus-visible:outline-2 focus-visible:outline-text-accent md:hidden"
          >
            <span className="text-base leading-6 font-bold text-foreground">
              Resumo do pedido
              <span className="block text-sm font-normal text-text-secondary">
                {itemCount} {itemCount === 1 ? 'NFT' : 'NFTs'}
              </span>
            </span>
            <ChevronDown aria-hidden="true" className={cn('size-5 shrink-0 text-text-accent transition-transform', summaryOpen && 'rotate-180')} />
          </button>
          <div id="checkout-summary" className={cn('mt-5 md:mt-0 md:block', summaryOpen ? 'block' : 'hidden')}>
            <CheckoutItems items={cart.items} quote={quote.data} isLoading={quote.isPending} headingId="checkout-items-title" />
            {cart.couponCode || couponOpen ? (
              <CouponForm
                appliedCode={cart.couponCode}
                appliedDescription={quote.data?.coupon?.description}
                disabled={busy}
                className="mt-4"
              />
            ) : (
              <p className="mt-4 text-center text-sm leading-5 text-foreground">
                Tem um código promocional?{' '}
                <button
                  type="button"
                  onClick={() => setCouponOpen(true)}
                  className="cursor-pointer rounded-xs font-medium text-foreground underline-offset-4 hover:text-text-accent hover:underline focus-visible:outline-2 focus-visible:outline-text-accent"
                >
                  Aplique aqui
                </button>
              </p>
            )}
            <OrderSummary
              className="mt-5"
              quote={quote.data}
              isLoading={quote.isPending}
              isUpdating={quote.isFetching && !quote.isPending}
              isError={quote.isError}
              onRetry={() => void quote.refetch()}
            />
          </div>
        </div>

        <section aria-label="Carteira e rede" className="order-1 flex min-w-0 flex-col gap-6 md:order-3 lg:col-start-2 lg:row-start-2 lg:gap-5">
          {available.length > 0 ? (
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="wallet-picker-title" className="text-base leading-6 font-bold text-foreground lg:text-[15px]">
                  {walletReady ? 'Carteira conectada' : 'Carteira de pagamento'}
                </h2>
                <Link
                  to="/perfil/carteiras"
                  className="rounded-xs text-sm font-medium text-text-accent hover:underline focus-visible:outline-2 focus-visible:outline-text-accent"
                >
                  Trocar carteira
                </Link>
              </div>
              <WalletPicker
                className="mt-4 md:mt-3"
                wallets={available}
                value={walletId}
                onValueChange={selectWallet}
                connectedWalletId={walletReady ? walletId : null}
                labelledBy="wallet-picker-title"
                disabled={busy}
              />
            </div>
          ) : (
            <EmptyState
              icon={<WalletCards />}
              title="Nenhuma carteira cadastrada"
              description="As carteiras do seu perfil aparecem aqui para pagar e receber os NFTs."
              headingLevel="h2"
              className="py-8"
              action={
                <Button asChild size="sm">
                  <Link to="/perfil/carteiras">Cadastrar carteira</Link>
                </Button>
              }
            />
          )}

          <div>
            <h2 id="provider-title" className="text-base leading-6 font-bold text-foreground lg:text-center">
              Carteira e rede
            </h2>
            <ProviderPicker
              className="mt-4 md:mt-3"
              value={provider}
              onValueChange={(next) => setValue('walletProvider', next, { shouldDirty: true, shouldValidate: form.formState.isSubmitted })}
              labelledBy="provider-title"
              disabled={busy}
            />
          </div>

          <WalletConnectionPanel
            wallet={selectedWallet}
            network={network}
            provider={provider}
            requirementError={walletRequirement}
            connectButtonRef={connectButtonRef}
            disabled={busy}
          />
          {walletRequirement && !selectedWallet ? (
            <p role="alert" className="text-sm text-danger">
              {walletRequirement}
            </p>
          ) : null}
        </section>

        <div className="order-4 flex flex-col gap-6 lg:col-start-2 lg:row-start-3">
          <div className="flex items-baseline justify-end gap-6 text-lg leading-6 md:hidden">
            <span className="font-bold text-foreground">Total:</span>
            {quote.data ? (
              <span className="font-bold text-text-accent tabular-nums">
                <span aria-hidden="true">{formatEth(quote.data.totalEth)}</span>
                <span className="sr-only">{formatEthForScreenReader(quote.data.totalEth)}</span>
              </span>
            ) : (
              <Skeleton className="h-5 w-24 self-center" />
            )}
          </div>
          <Button
            type="submit"
            size="pill-lg"
            loading={checkout.phase === 'revalidating' && !checkout.quote}
            loadingLabel="Validando compra"
            disabled={busy}
            className="w-full md:hidden"
          >
            Confirmar compra
          </Button>
          <Button
            type="submit"
            size="md"
            loading={checkout.phase === 'revalidating' && !checkout.quote}
            loadingLabel="Validando compra"
            disabled={busy}
            className="hidden w-full md:flex"
          >
            Confirmar compra
          </Button>
        </div>
      </form>

      <CheckoutDialog
        checkout={checkout}
        wallet={available.find((wallet) => wallet.id === checkout.input?.walletId) ?? selectedWallet}
        items={cart.items}
        onEdit={checkout.backToEdit}
        onRetryAfterRejection={retryAfterRejection}
      />
    </>
  )
}

function PaymentSkeleton() {
  return (
    <div aria-busy="true" className="mt-6 flex flex-col gap-8 md:mt-[22px] lg:grid lg:grid-cols-[minmax(0,1fr)_405px] lg:gap-x-8">
      <span className="sr-only" role="status">
        Carregando pagamento
      </span>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-48" />
        <div className="mt-3 grid gap-x-6 gap-y-3 md:grid-cols-2">
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-12 md:h-[42px]" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-28" />
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[70px]" />
        ))}
        <Skeleton className="mt-4 h-40" />
      </div>
    </div>
  )
}
