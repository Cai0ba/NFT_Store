import { createSeed } from './seed'
import { dbStateSchema, type DbState, type SeedKind } from './schema'

const STORAGE_KEY = 'kurio:mock-db:v1'
const STALE_SESSION_MS = 24 * 60 * 60 * 1000

let current: DbState | null = null
let warnedQuota = false

function load(): DbState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = dbStateSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

function persist() {
  if (!current) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch (error) {
    // Avatares grandes podem estourar a cota; o estado continua válido em memória até o refresh.
    if (!warnedQuota) console.warn('[mocks] Não foi possível persistir o banco simulado', error)
    warnedQuota = true
  }
}

function state(): DbState {
  if (!current) throw new Error('Banco simulado não inicializado: chame db.init() antes de atender requisições')
  return current
}

export const db = {
  get state() {
    return state()
  },

  async init(kind: SeedKind) {
    const loaded = load()
    if (loaded && loaded.seedKind === kind) {
      const now = Date.now()
      loaded.sessions = loaded.sessions.filter((s) => s.expiresAt + STALE_SESSION_MS > now)
      current = loaded
      persist()
      return
    }
    await db.reset(kind)
  },

  async reset(kind: SeedKind) {
    current = await createSeed(kind)
    persist()
  },

  /** Executa uma mutação e grava o resultado; o retorno da função é repassado. */
  mutate<T>(fn: (s: DbState) => T): T {
    const result = fn(state())
    persist()
    return result
  },

  /** Ids sequenciais deixam pedidos e itens previsíveis nos testes. */
  nextId(prefix: string) {
    const s = state()
    s.seq += 1
    return `${prefix}_${String(s.seq).padStart(5, '0')}`
  },

  clearStorage() {
    localStorage.removeItem(STORAGE_KEY)
  },
}
