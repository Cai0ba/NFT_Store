import { useCallback, useSyncExternalStore } from 'react'

/** SPA sem SSR: o valor já está correto no primeiro render, sem flash de layout. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Mesmo corte do `md:` do Tailwind (48rem). */
export const useIsDesktop = () => useMediaQuery('(min-width: 48rem)')
