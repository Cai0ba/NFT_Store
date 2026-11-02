import type { z } from 'zod'

type Area = 'local' | 'session'

const STORAGE_PREFIX = 'kurio.'

function getArea(area: Area): Storage | null {
  try {
    return area === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    // Safari em modo privado e iframes com cookies bloqueados lançam ao acessar o storage.
    return null
  }
}

export function storageKey(name: string) {
  return `${STORAGE_PREFIX}${name}`
}

/** Lê e valida um valor JSON; conteúdo corrompido ou de versão antiga é descartado. */
export function readStorage<T>(area: Area, name: string, schema: z.ZodType<T>): T | null {
  const storage = getArea(area)
  const raw = storage?.getItem(storageKey(name))
  if (raw == null) return null
  try {
    const result = schema.safeParse(JSON.parse(raw))
    if (result.success) return result.data
  } catch {
    // JSON inválido: cai na remoção abaixo
  }
  storage?.removeItem(storageKey(name))
  return null
}

export function writeStorage(area: Area, name: string, value: unknown) {
  try {
    getArea(area)?.setItem(storageKey(name), JSON.stringify(value))
  } catch {
    // Cota excedida não deve derrubar o fluxo; o dado só deixa de sobreviver ao refresh.
  }
}

export function removeStorage(area: Area, name: string) {
  getArea(area)?.removeItem(storageKey(name))
}
