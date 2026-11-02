export function normalizeText(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

export const isoAt = (ms: number) => new Date(ms).toISOString()
export const nowIso = () => isoAt(Date.now())
