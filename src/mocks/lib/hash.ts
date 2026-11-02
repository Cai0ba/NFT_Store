/** FNV-1a de 32 bits. Hash síncrono e estável entre execuções; não é criptográfico. */
export function fnv1a(input: string, seed = 0x811c9dc5) {
  let hash = seed >>> 0
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

const toHex = (value: number) => value.toString(16).padStart(8, '0')

/** Concatena rodadas com sementes diferentes para chegar ao tamanho pedido (em blocos de 8 hex). */
export function stableHash(input: string, blocks = 2) {
  let out = ''
  for (let i = 0; i < blocks; i++) out += toHex(fnv1a(`${i}:${input}`, 0x811c9dc5 ^ Math.imul(i + 1, 0x9e3779b1)))
  return out
}

/** JSON com chaves ordenadas: o mesmo conteúdo sempre produz a mesma string. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}
