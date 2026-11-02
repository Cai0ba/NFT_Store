import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useReducer, useRef } from 'react'
import { z } from 'zod'
import { createOrder } from '@/api/endpoints/orders'
import { ApiError, hasErrorCode, isApiError, isTransientError } from '@/api/errors'
import { queryKeys } from '@/api/query-keys'
import { retryDelay } from '@/app/query-client'
import { useSession } from '@/features/auth/session'
import { sessionStore } from '@/features/auth/session-store'
import { cartQuoteQueryOptions } from '@/features/cart/hooks'
import { useOrder } from '@/features/orders/hooks'
import { clearPendingOrder, getPendingOrderId, savePendingOrder } from '@/features/orders/pending-store'
import { resetWalletConnection } from '@/features/wallets/hooks'
import {
  collectorInfoSchema,
  createOrderRequestSchema,
  quoteSchema,
  type CollectorInfo,
  type CreateOrderRequest,
  type Network,
  type Order,
  type Quote,
} from '@/shared/contracts'
import { createId } from '@/shared/lib/ids'
import { readStorage, removeStorage, writeStorage } from '@/shared/lib/storage'
import { clearCheckoutDraft } from './draft'

export type CheckoutPhase =
  | 'editing'
  | 'reviewing'
  | 'revalidating'
  | 'quote-changed'
  | 'submitting'
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'error'

export interface CheckoutInput {
  collector: CollectorInfo
  walletId: string
  network: Network
}

/* ---------- Tentativa de envio (idempotência) ---------- */

/**
 * Uma tentativa = uma Idempotency-Key + o corpo exato enviado. Fica no sessionStorage até haver
 * resposta definitiva; enquanto existir, qualquer reenvio (retry, timeout, refresh) usa a mesma
 * chave e o mesmo corpo, então o servidor devolve o pedido já criado em vez de criar outro.
 */
const attemptSchema = z.object({ key: z.string().min(1), body: createOrderRequestSchema })
type OrderAttempt = z.infer<typeof attemptSchema>

const attemptStorage = (userId: string) => `checkoutAttempt.${userId}`
const readAttempt = (userId: string) => readStorage('session', attemptStorage(userId), attemptSchema)
const writeAttempt = (userId: string, attempt: OrderAttempt) => writeStorage('session', attemptStorage(userId), attempt)
const clearAttempt = (userId: string) => removeStorage('session', attemptStorage(userId))

const MAX_SUBMIT_ATTEMPTS = 3

/* ---------- Máquina de estados ---------- */

type StoredPhase = Exclude<CheckoutPhase, 'confirmed' | 'rejected'>
type ErrorOrigin = 'review' | 'submit'

interface CheckoutState {
  phase: StoredPhase
  input: CheckoutInput | null
  /** Cotação revisada pelo usuário (ou a nova, em `quote-changed`). */
  quote: Quote | null
  /** Cotação anterior, para a UI mostrar o que mudou. */
  previousQuote: Quote | null
  orderId: string | null
  error: ApiError | null
  errorOrigin: ErrorOrigin | null
}

type CheckoutAction =
  | { type: 'review-start'; input: CheckoutInput }
  | { type: 'review-ok'; quote: Quote }
  | { type: 'quote-changed'; quote: Quote; previous: Quote | null }
  | { type: 'accept'; quote: Quote }
  | { type: 'revalidate' }
  | { type: 'submit' }
  | { type: 'order-created'; orderId: string }
  | { type: 'fail'; error: ApiError; origin: ErrorOrigin }
  | { type: 'edit' }

function reducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case 'review-start':
      return { ...state, phase: 'revalidating', input: action.input, error: null, errorOrigin: null }
    case 'review-ok':
      return { ...state, phase: 'reviewing', quote: action.quote, previousQuote: null }
    case 'quote-changed':
      return { ...state, phase: 'quote-changed', quote: action.quote, previousQuote: action.previous, error: null }
    case 'accept':
      return { ...state, phase: 'reviewing', quote: action.quote, previousQuote: null }
    case 'revalidate':
      return { ...state, phase: 'revalidating', error: null, errorOrigin: null }
    case 'submit':
      return { ...state, phase: 'submitting', error: null, errorOrigin: null }
    case 'order-created':
      return { ...state, phase: 'pending', orderId: action.orderId, error: null, errorOrigin: null }
    case 'fail':
      return { ...state, phase: 'error', error: action.error, errorOrigin: action.origin }
    case 'edit':
      return { ...state, phase: 'editing', previousQuote: null, error: null, errorOrigin: null }
  }
}

function initialState(): CheckoutState {
  const userId = sessionStore.getState().user?.id
  const base: CheckoutState = {
    phase: 'editing',
    input: null,
    quote: null,
    previousQuote: null,
    orderId: null,
    error: null,
    errorOrigin: null,
  }
  if (!userId) return base
  const pendingOrderId = getPendingOrderId()
  if (pendingOrderId) return { ...base, phase: 'pending', orderId: pendingOrderId }
  // Envio interrompido (refresh durante timeout): retoma com a mesma chave assim que montar.
  if (readAttempt(userId)) return { ...base, phase: 'submitting' }
  return base
}

function validationError(collector: CollectorInfo): ApiError | null {
  const result = collectorInfoSchema.safeParse(collector)
  if (result.success) return null
  const fieldErrors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const name = issue.path.join('.')
    if (name && !fieldErrors[name]) fieldErrors[name] = issue.message
  }
  return new ApiError({
    status: 422,
    code: 'VALIDATION_ERROR',
    message: 'Dados do colecionador inválidos',
    fieldErrors,
  })
}

function asApiError(error: unknown): ApiError {
  return isApiError(error)
    ? error
    : new ApiError({ status: 0, code: 'INTERNAL_ERROR', message: 'Erro inesperado', cause: error })
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface UseCheckoutResult {
  phase: CheckoutPhase
  input: CheckoutInput | null
  quote: Quote | null
  previousQuote: Quote | null
  order: Order | null
  orderId: string | null
  error: ApiError | null
  /** Em revisão, com cotação atual e ao menos um item comprável. */
  canConfirm: boolean
  isBusy: boolean
  review(collector: CollectorInfo, walletId: string, network: Network): Promise<void>
  acceptChanges(): void
  confirm(): Promise<void>
  retry(): Promise<void>
  backToEdit(): void
}

export function useCheckout(): UseCheckoutResult {
  const queryClient = useQueryClient()
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const inFlight = useRef(false)

  const orderQuery = useOrder(state.orderId)
  const order = orderQuery.data ?? null

  // Cotação "viva": eventos do socket invalidam a cotação; se o hash mudar durante a revisão, a
  // confirmação fica bloqueada até o usuário aceitar os novos valores.
  const { user } = useSession()
  const liveQuote = useQuery({
    ...cartQuoteQueryOptions(`user:${user?.id ?? 'none'}`, state.input?.network ?? 'ethereum'),
    enabled: Boolean(user && state.input && state.phase === 'reviewing'),
  }).data

  let phase: CheckoutPhase = state.phase
  let quote = state.quote
  let previousQuote = state.previousQuote
  let error = state.error
  if (state.phase === 'pending' && order && order.status !== 'pending') {
    phase = order.status
  } else if (state.phase === 'pending' && hasErrorCode(orderQuery.error, 'NOT_FOUND', 'FORBIDDEN')) {
    phase = 'error'
    error = orderQuery.error
  } else if (state.phase === 'reviewing' && state.quote && liveQuote && liveQuote.hash !== state.quote.hash) {
    phase = 'quote-changed'
    previousQuote = state.quote
    quote = liveQuote
  }

  // Pedido salvo que o servidor não reconhece (banco resetado, outro usuário): esquece o id para
  // a próxima visita ao pagamento não abrir presa no mesmo erro.
  const lostOrderId =
    state.phase === 'pending' && hasErrorCode(orderQuery.error, 'NOT_FOUND', 'FORBIDDEN') ? state.orderId : null
  useEffect(() => {
    if (lostOrderId) clearPendingOrder(lostOrderId)
  }, [lostOrderId])

  const fetchFreshQuote = useCallback(
    async (network: Network): Promise<Quote> => {
      const userId = sessionStore.getState().user?.id
      if (!userId) throw new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: 'Sessão encerrada' })
      return queryClient.query({ ...cartQuoteQueryOptions(`user:${userId}`, network), staleTime: 0 })
    },
    [queryClient],
  )

  const submit = useCallback(
    async (attempt: OrderAttempt, reviewedQuote: Quote | null) => {
      const userId = sessionStore.getState().user?.id
      if (!userId) return
      dispatch({ type: 'submit' })

      for (let tryNumber = 1; ; tryNumber += 1) {
        try {
          const created = await createOrder(attempt.body, attempt.key)
          clearAttempt(userId)
          clearCheckoutDraft()
          queryClient.setQueryData(queryKeys.order.detail(created.id), created)
          savePendingOrder(created.id)
          dispatch({ type: 'order-created', orderId: created.id })
          return
        } catch (error) {
          if (isTransientError(error) && tryNumber < MAX_SUBMIT_ATTEMPTS) {
            await sleep(retryDelay(tryNumber))
            continue
          }
          const apiError = asApiError(error)
          // Sem resposta definitiva o pedido pode ter sido criado: a tentativa continua salva para o retry.
          if (apiError.isTransient) {
            dispatch({ type: 'fail', error: apiError, origin: 'submit' })
            return
          }
          clearAttempt(userId)
          if (apiError.code === 'QUOTE_OUTDATED') {
            const current = quoteSchema.safeParse(apiError.details)
            if (current.success) {
              queryClient.setQueryData(queryKeys.cart.quote(`user:${userId}`, current.data.network), current.data)
              dispatch({ type: 'quote-changed', quote: current.data, previous: reviewedQuote })
              return
            }
          }
          if (apiError.code === 'WALLET_NOT_CONNECTED') resetWalletConnection()
          dispatch({ type: 'fail', error: apiError, origin: 'submit' })
          return
        }
      }
    },
    [queryClient],
  )

  // Retomada após refresh no meio de um envio sem resposta.
  useEffect(() => {
    const userId = sessionStore.getState().user?.id
    const pending = userId ? readAttempt(userId) : null
    if (!pending || inFlight.current) return
    inFlight.current = true
    void submit(pending, null).finally(() => {
      inFlight.current = false
    })
  }, [submit])

  const review = useCallback(
    async (collector: CollectorInfo, walletId: string, network: Network) => {
      if (inFlight.current) return
      const invalid = validationError(collector)
      if (invalid) {
        dispatch({ type: 'fail', error: invalid, origin: 'review' })
        return
      }
      inFlight.current = true
      dispatch({ type: 'review-start', input: { collector, walletId, network } })
      try {
        dispatch({ type: 'review-ok', quote: await fetchFreshQuote(network) })
      } catch (error) {
        dispatch({ type: 'fail', error: asApiError(error), origin: 'review' })
      } finally {
        inFlight.current = false
      }
    },
    [fetchFreshQuote],
  )

  // As `issues` da cotação são informativas (o servidor já ajusta quantidade e não cobra esgotados) e
  // ficam visíveis na revisão; só não há o que confirmar se nenhuma linha pode ser comprada.
  const canConfirm = phase === 'reviewing' && Boolean(state.quote?.lines.some((line) => line.quantity > 0))

  /** Revalida a cotação e envia. Uma tentativa ainda sem resposta definitiva é reenviada antes de tudo. */
  const revalidateAndSubmit = useCallback(async () => {
    const userId = sessionStore.getState().user?.id
    if (inFlight.current || !userId) return
    inFlight.current = true
    try {
      const unresolved = readAttempt(userId)
      if (unresolved) {
        await submit(unresolved, state.quote)
        return
      }
      if (!state.input || !state.quote) {
        dispatch({ type: 'edit' })
        return
      }
      dispatch({ type: 'revalidate' })
      const fresh = await fetchFreshQuote(state.input.network)
      if (fresh.hash !== state.quote.hash) {
        dispatch({ type: 'quote-changed', quote: fresh, previous: state.quote })
        return
      }
      const { collector, walletId, network } = state.input
      const body: CreateOrderRequest = { quoteId: fresh.id, quoteHash: fresh.hash, walletId, network, collector }
      const attempt: OrderAttempt = { key: createId(), body }
      writeAttempt(userId, attempt)
      await submit(attempt, state.quote)
    } catch (error) {
      dispatch({ type: 'fail', error: asApiError(error), origin: 'submit' })
    } finally {
      inFlight.current = false
    }
  }, [fetchFreshQuote, state.input, state.quote, submit])

  const confirm = useCallback(async () => {
    if (canConfirm) await revalidateAndSubmit()
  }, [canConfirm, revalidateAndSubmit])

  const acceptChanges = useCallback(() => {
    if (phase === 'quote-changed' && quote) dispatch({ type: 'accept', quote })
  }, [phase, quote])

  const retry = useCallback(async () => {
    if (phase !== 'error') return
    if (state.errorOrigin === 'review' && state.input) {
      const { collector, walletId, network } = state.input
      await review(collector, walletId, network)
    } else if (state.errorOrigin === 'submit') {
      await revalidateAndSubmit()
    } else {
      dispatch({ type: 'edit' })
    }
  }, [phase, revalidateAndSubmit, review, state.errorOrigin, state.input])

  const backToEdit = useCallback(() => {
    if (inFlight.current || phase === 'submitting' || phase === 'pending' || phase === 'confirmed') return
    dispatch({ type: 'edit' })
  }, [phase])

  return {
    phase,
    input: state.input,
    quote,
    previousQuote,
    order,
    orderId: state.orderId,
    error,
    canConfirm,
    isBusy: phase === 'revalidating' || phase === 'submitting',
    review,
    acceptChanges,
    confirm,
    retry,
    backToEdit,
  }
}
