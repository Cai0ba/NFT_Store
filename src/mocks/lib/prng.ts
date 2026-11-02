/** mulberry32: PRNG pequeno e rápido, suficiente para fixtures e latências reprodutíveis. */
export function createPrng(seed: number) {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int(min: number, max: number) {
      return min + Math.floor(next() * (max - min + 1))
    },
    pick<T>(items: readonly T[]): T {
      const item = items[Math.floor(next() * items.length)]
      if (item === undefined) throw new Error('Lista vazia')
      return item
    },
    chance(probability: number) {
      return next() < probability
    },
    /** Fisher-Yates: `sort` com comparador aleatório não é determinístico entre engines. */
    shuffle<T>(items: readonly T[]): T[] {
      const copy = [...items]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        const a = copy[i] as T
        copy[i] = copy[j] as T
        copy[j] = a
      }
      return copy
    },
  }
}

export type Prng = ReturnType<typeof createPrng>
