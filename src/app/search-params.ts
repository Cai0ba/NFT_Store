/**
 * Serialização "plana" da URL (?category=a&category=b&page=2) em vez do JSON padrão do TanStack Router.
 * Fica legível, compartilhável e é o mesmo formato aceito pela API. A tipagem fina de cada chave
 * (arrays, números) é responsabilidade do validateSearch de cada rota.
 */
export function parseSearch(searchStr: string): Record<string, unknown> {
  const params = new URLSearchParams(searchStr.startsWith('?') ? searchStr.slice(1) : searchStr)
  const out: Record<string, unknown> = {}
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key)
    out[key] = values.length > 1 ? values : values[0]
  }
  return out
}

export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) value.forEach((v) => params.append(key, String(v)))
    else params.set(key, String(value))
  }
  const str = params.toString()
  return str ? `?${str}` : ''
}
