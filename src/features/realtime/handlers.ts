import type { QueryClient } from '@tanstack/react-query'
import { queryKeys, type CartOwnerKey } from '@/api/query-keys'
import { sessionStore } from '@/features/auth/session-store'
import { getCartOwner } from '@/features/cart/hooks'
import { pushCartNotices, type CartChangeNotice } from '@/features/cart/notices'
import {
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
  type Cart,
  type CartItem,
  type CatalogResponse,
  type NftDetailResponse,
  type NftSummary,
  type NftUpdatedEvent,
  type Order,
  type OrderUpdatedEvent,
} from '@/shared/contracts'
import { announce } from '@/shared/lib/announcer'
import { compareEth, formatEth, mulEth } from '@/shared/lib/money'
import { isTerminalOrder } from '@/features/orders/status'

const SEEN_EVENTS_LIMIT = 500

/** Conjunto com limite: guarda os últimos N eventIds para ignorar reenvios do mesmo fato. */
class RecentIds {
  private readonly ids = new Set<string>()
  constructor(private readonly limit: number) {}

  /** Retorna `false` se o id já foi visto. */
  add(id: string) {
    if (this.ids.has(id)) return false
    this.ids.add(id)
    if (this.ids.size > this.limit) {
      const oldest = this.ids.values().next().value
      if (oldest !== undefined) this.ids.delete(oldest)
    }
    return true
  }
}

export interface RealtimeHandlers {
  onNftUpdated(payload: unknown): void
  onOrderUpdated(payload: unknown): void
  reconcile(): void
}

export function createRealtimeHandlers(queryClient: QueryClient, userId: string | null): RealtimeHandlers {
  const seen = new RecentIds(SEEN_EVENTS_LIMIT)
  const nftVersions = new Map<string, number>()
  const orderVersions = new Map<string, number>()

  function onNftUpdated(payload: unknown) {
    const parsed = nftUpdatedEventSchema.safeParse(payload)
    if (!parsed.success) return
    const event = parsed.data
    const { nftId } = event.data
    const { version } = event.resource
    if (!seen.add(event.eventId)) return
    if (version <= Math.max(nftVersions.get(nftId) ?? 0, cachedNftVersion(queryClient, nftId))) return
    nftVersions.set(nftId, version)

    applyToNftQueries(queryClient, event)
    applyToCatalogQueries(queryClient, event)
    applyToCarts(queryClient, event)
  }

  function onOrderUpdated(payload: unknown) {
    const parsed = orderUpdatedEventSchema.safeParse(payload)
    if (!parsed.success) return
    const event = parsed.data
    // Evento endereçado a outra sessão (troca de usuário com evento em trânsito) não toca no cache.
    if (!userId || event.data.userId !== userId || sessionStore.getState().user?.id !== userId) return
    if (!seen.add(event.eventId)) return
    applyOrderUpdate(queryClient, event, orderVersions)
  }

  /**
   * Ao (re)conectar, eventos podem ter sido perdidos: o REST é a fonte para reconciliar. Requisições
   * em voo são mantidas (`cancelRefetch: false`) para não duplicar chamadas do carregamento inicial.
   */
  function reconcile() {
    const options = { cancelRefetch: false } as const
    void queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all }, options)
    void queryClient.invalidateQueries({ queryKey: queryKeys.nft.all }, options)
    void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all }, options)
    void queryClient.invalidateQueries(
      {
        queryKey: queryKeys.order.all,
        predicate: (query) => (query.state.data as Order | undefined)?.status !== 'confirmed',
      },
      options,
    )
  }

  return { onNftUpdated, onOrderUpdated, reconcile }
}

function cachedNftVersion(queryClient: QueryClient, nftId: string) {
  return queryClient.getQueryData<NftDetailResponse>(queryKeys.nft.detail(nftId))?.nft.version ?? 0
}

function patchSummary<T extends NftSummary>(summary: T, event: NftUpdatedEvent): T {
  if (summary.id !== event.data.nftId || summary.version >= event.resource.version) return summary
  return { ...summary, priceEth: event.data.priceEth, soldOut: event.data.soldOut, version: event.resource.version }
}

function applyToNftQueries(queryClient: QueryClient, event: NftUpdatedEvent) {
  const editions = new Map(event.data.editions.map((e) => [e.id, e]))
  queryClient.setQueriesData<NftDetailResponse>({ queryKey: queryKeys.nft.all }, (old) => {
    if (!old) return old
    const patched = patchSummary(old.nft, event)
    const nft =
      patched === old.nft
        ? old.nft
        : {
            ...patched,
            editions: old.nft.editions.map((edition) => {
              const update = editions.get(edition.id)
              return update ? { ...edition, priceEth: update.priceEth, available: update.available } : edition
            }),
          }
    const related = old.related.map((item) => patchSummary(item, event))
    const relatedChanged = related.some((item, i) => item !== old.related[i])
    return nft === old.nft && !relatedChanged ? old : { ...old, nft, related: relatedChanged ? related : old.related }
  })
}

function applyToCatalogQueries(queryClient: QueryClient, event: NftUpdatedEvent) {
  queryClient.setQueriesData<CatalogResponse>({ queryKey: queryKeys.catalog.all }, (old) => {
    if (!old) return old
    const items = old.items.map((item) => patchSummary(item, event))
    const featured = old.featured ? patchSummary(old.featured, event) : null
    const changed = featured !== old.featured || items.some((item, i) => item !== old.items[i])
    return changed ? { ...old, items, featured } : old
  })
  // Preço novo pode tirar o item de um filtro/ordenação: as listas ficam obsoletas para o próximo acesso.
  void queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all, refetchType: 'none' })
}

function applyToCarts(queryClient: QueryClient, event: NftUpdatedEvent) {
  const editions = new Map(event.data.editions.map((e) => [e.id, e]))
  const currentOwner = getCartOwner()

  for (const [queryKey, cart] of queryClient.getQueriesData<Cart>({ queryKey: queryKeys.cart.all })) {
    if (!cart || queryKey.length !== 2) continue
    const owner = queryKey[1] as CartOwnerKey
    const notices: CartChangeNotice[] = []
    let changed = false

    const items = cart.items.map((item) => {
      const update = item.nftId === event.data.nftId ? editions.get(item.editionId) : undefined
      if (!update) return item
      if (update.priceEth === item.unitPriceEth && update.available === item.available) return item
      changed = true
      const notice = describeChange(item, update, event)
      if (notice) notices.push(notice)
      return {
        ...item,
        unitPriceEth: update.priceEth,
        available: update.available,
        lineTotalEth: mulEth(update.priceEth, item.quantity),
      }
    })

    if (!changed) continue
    queryClient.setQueryData<Cart>(queryKeys.cart.detail(owner), { ...cart, items })
    void queryClient.invalidateQueries({ queryKey: queryKeys.cart.detail(owner) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.cart.quotes(owner) })

    if (owner === currentOwner && notices.length > 0) {
      pushCartNotices(notices)
      announce(notices.map((n) => n.message).join(' '), 'assertive')
    }
  }
}

function describeChange(
  item: CartItem,
  update: { priceEth: string; available: number },
  event: NftUpdatedEvent,
): CartChangeNotice | null {
  const subject = `${item.name} (${item.editionLabel})`
  const priceDelta = compareEth(update.priceEth, item.unitPriceEth)
  let kind: CartChangeNotice['kind'] | null = null
  let message = ''

  if (update.available === 0 && item.available > 0) {
    kind = 'sold-out'
    message = `${subject} esgotou e não entra mais na compra.`
  } else if (update.available < item.quantity && update.available < item.available) {
    kind = 'availability-reduced'
    message = `${update.available === 1 ? 'Resta 1 unidade' : `Restam ${update.available} unidades`} de ${subject}; você tem ${item.quantity} no carrinho.`
  } else if (priceDelta !== 0) {
    kind = priceDelta > 0 ? 'price-increased' : 'price-decreased'
    message = `O preço de ${subject} ${priceDelta > 0 ? 'subiu' : 'caiu'} de ${formatEth(item.unitPriceEth)} para ${formatEth(update.priceEth)}.`
  } else if (item.available === 0 && update.available > 0) {
    kind = 'back-in-stock'
    message = `${subject} voltou a ter unidades disponíveis.`
  }

  if (!kind) return null
  return {
    id: `${event.eventId}:${item.id}`,
    itemId: item.id,
    nftId: item.nftId,
    name: item.name,
    editionLabel: item.editionLabel,
    kind,
    previousPriceEth: item.unitPriceEth,
    currentPriceEth: update.priceEth,
    previousAvailable: item.available,
    available: update.available,
    quantity: item.quantity,
    message,
    occurredAt: event.occurredAt,
  }
}

function applyOrderUpdate(queryClient: QueryClient, event: OrderUpdatedEvent, versions: Map<string, number>) {
  const { orderId, status, failureReason } = event.data
  const { version } = event.resource
  const queryKey = queryKeys.order.detail(orderId)
  const cached = queryClient.getQueryData<Order>(queryKey)

  if (cached && isTerminalOrder(cached.status)) return
  if (version <= Math.max(versions.get(orderId) ?? 0, cached?.version ?? 0)) return
  versions.set(orderId, version)

  // O evento não traz o recibo completo (hash, link, horário): recusa pode ser aplicada direto,
  // confirmação só é exibida depois do snapshot REST, para o recibo nunca aparecer pela metade.
  if (cached && status === 'rejected') {
    queryClient.setQueryData<Order>(queryKey, { ...cached, status, version, failureReason })
  }
  void queryClient.invalidateQueries({ queryKey, refetchType: 'all' })

  if (status === 'confirmed') {
    void queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.nft.all })
  }
}
