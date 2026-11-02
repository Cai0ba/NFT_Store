import { createFileRoute } from '@tanstack/react-router'
import { useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/common/ErrorState'
import { pageTitle } from '@/components/layout/page-title'
import { Skeleton } from '@/components/ui/skeleton'
import { SpinnerIcon } from '@/components/ui/spinner'
import { getErrorMessage } from '@/api/errors'
import { useProfile } from '@/features/profile/hooks'
import { RingCheckbox } from '@/features/wallets/components/fields'
import { WalletForm, type WalletFormInput } from '@/features/wallets/components/WalletForm'
import { WalletSummary } from '@/features/wallets/components/WalletSummary'
import { useUpsertWallet, useWallets } from '@/features/wallets/hooks'
import type { Profile, Wallet, WalletsResponse } from '@/shared/contracts'

export const Route = createFileRoute('/perfil/carteiras')({
  head: () => ({ meta: [{ title: pageTitle('Carteiras') }] }),
  component: WalletsPage,
})

function WalletsPage() {
  const wallets = useWallets()
  const profile = useProfile()

  if (wallets.isError || profile.isError) {
    const failed = wallets.isError ? wallets : profile
    return (
      <ErrorState
        title="Não foi possível carregar suas carteiras"
        description={getErrorMessage(failed.error)}
        onRetry={() => void failed.refetch()}
        retrying={failed.isFetching}
      />
    )
  }
  if (!wallets.data || !profile.data) return <WalletsSkeleton />
  return <WalletsManager wallets={wallets.data} profile={profile.data} />
}

type Mode = 'view' | 'form'

function fromWallet(wallet: Wallet): WalletFormInput {
  return {
    displayName: wallet.displayName,
    nickname: wallet.nickname,
    network: wallet.network,
    profileName: wallet.profileName,
    address: wallet.address,
    ensOrSecondary: wallet.ensOrSecondary ?? '',
    provider: wallet.provider,
    referralCode: wallet.referralCode,
    email: wallet.email,
    ensName: wallet.ensName,
    ensSuffix: wallet.ensSuffix,
  }
}

const fromProfile = (profile: Profile): Partial<WalletFormInput> => ({
  displayName: profile.displayName,
  nickname: profile.walletNickname,
  profileName: profile.username,
  email: profile.email,
  ensName: profile.ensName,
  ensSuffix: profile.ensSuffix,
})

const actionClass =
  'cursor-pointer rounded-xs text-sm leading-5 font-medium text-text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent disabled:cursor-not-allowed disabled:opacity-50'

function WalletsManager({ wallets, profile }: { wallets: WalletsResponse; profile: Profile }) {
  const { primary, secondary } = wallets
  const [primaryMode, setPrimaryMode] = useState<Mode>(primary ? 'view' : 'form')
  const [secondaryMode, setSecondaryMode] = useState<Mode>('view')
  const sameAsPrimary = useUpsertWallet('secondary')
  const primaryHeading = useRef<HTMLHeadingElement>(null)
  const secondaryHeading = useRef<HTMLHeadingElement>(null)

  const showPrimaryForm = primaryMode === 'form' || !primary
  const showSecondaryForm = secondaryMode === 'form'
  const secondaryMirrorsPrimary = Boolean(secondary?.sameAsPrimary) && !showSecondaryForm

  const toggleSameAsPrimary = (checked: boolean) => {
    if (!checked) {
      // Desmarcar não apaga nada: abre o formulário para cadastrar uma secundária própria.
      setSecondaryMode('form')
      return
    }
    sameAsPrimary.mutate(
      { sameAsPrimary: true },
      {
        onSuccess: () => {
          setSecondaryMode('view')
          toast.success('A carteira secundária agora é igual à principal.')
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <WalletSection
        headingRef={primaryHeading}
        id="primary-wallet"
        title="Carteira principal"
        description="Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados."
        action={
          primary ? (
            <button type="button" className={actionClass} onClick={() => setPrimaryMode(showPrimaryForm ? 'view' : 'form')}>
              {showPrimaryForm ? 'Cancelar' : 'Editar'}
            </button>
          ) : null
        }
      >
        {showPrimaryForm ? (
          <WalletForm
            key={primary?.updatedAt ?? 'new'}
            slot="primary"
            defaultValues={primary ? fromWallet(primary) : fromProfile(profile)}
            autoFocus={Boolean(primary)}
            onSaved={() => {
              setPrimaryMode('view')
              primaryHeading.current?.focus()
            }}
            onCancel={primary ? () => setPrimaryMode('view') : undefined}
          />
        ) : primary ? (
          <WalletSummary wallet={primary} />
        ) : null}
      </WalletSection>

      <WalletSection
        headingRef={secondaryHeading}
        id="secondary-wallet"
        title="Carteira secundária"
        action={
          <div className="flex flex-wrap items-center gap-4">
            <RingCheckbox
              label="Igual à carteira principal"
              checked={sameAsPrimary.isPending || secondaryMirrorsPrimary}
              disabled={!primary || sameAsPrimary.isPending}
              onChange={(event) => toggleSameAsPrimary(event.target.checked)}
              aria-describedby={!primary ? 'secondary-needs-primary' : undefined}
            />
            {sameAsPrimary.isPending ? <SpinnerIcon className="text-text-accent" /> : null}
            <button
              type="button"
              className={actionClass}
              onClick={() => setSecondaryMode(showSecondaryForm ? 'view' : 'form')}
            >
              {showSecondaryForm ? 'Cancelar' : secondary && !secondary.sameAsPrimary ? 'Editar' : 'Adicionar'}
            </button>
          </div>
        }
      >
        {showSecondaryForm ? (
          <WalletForm
            key={secondary?.updatedAt ?? 'new-secondary'}
            slot="secondary"
            defaultValues={
              secondary && !secondary.sameAsPrimary ? fromWallet(secondary) : { ...fromProfile(profile), nickname: 'Reserva' }
            }
            autoFocus
            onSaved={() => {
              setSecondaryMode('view')
              secondaryHeading.current?.focus()
            }}
            onCancel={() => setSecondaryMode('view')}
          />
        ) : secondary ? (
          secondary.sameAsPrimary ? (
            <p className="text-sm leading-5 text-text-secondary">
              A carteira secundária usa os mesmos dados da principal ({primary?.nickname ?? 'principal'}).
            </p>
          ) : (
            <WalletSummary wallet={secondary} />
          )
        ) : (
          <p className="text-sm leading-5 text-text-secondary">Você ainda não adicionou uma carteira secundária.</p>
        )}
        {!primary ? (
          <p id="secondary-needs-primary" className="mt-2 text-xs text-text-secondary">
            Cadastre a carteira principal para poder espelhá-la na secundária.
          </p>
        ) : null}
      </WalletSection>
    </div>
  )
}

function WalletSection({
  id,
  title,
  description,
  action,
  headingRef,
  children,
}: {
  id: string
  title: string
  description?: string
  action?: ReactNode
  headingRef: React.Ref<HTMLHeadingElement>
  children: ReactNode
}) {
  return (
    <section aria-labelledby={`${id}-title`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id={`${id}-title`} ref={headingRef} tabIndex={-1} className="text-[15px] leading-6 font-bold text-foreground outline-none">
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-xs leading-5 text-text-accent">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function WalletsSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <span role="status" className="sr-only">
        Carregando carteiras
      </span>
      <Skeleton className="h-5 w-44" />
      <Skeleton className="h-3.5 w-96 max-w-full" />
      <div className="grid gap-x-[29px] gap-y-5 md:grid-cols-2">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-12 md:h-[42px]" />
          </div>
        ))}
      </div>
    </div>
  )
}
