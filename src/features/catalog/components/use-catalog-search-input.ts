import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { catalogSearchSchema, withFilterChange } from '@/features/catalog/search'

const DEBOUNCE_MS = 300

/**
 * Campo de busca ligado ao `q` da Início. Na própria Início a busca é ao vivo, com debounce e `replace`
 * (cada tecla não vira uma entrada no histórico); fora dela só o Enter leva ao catálogo.
 */
export function useCatalogSearchInput() {
  const navigate = useNavigate()
  const location = useRouterState({ select: (s) => s.location })
  const onHome = location.pathname === '/'
  const urlQuery = onHome ? (catalogSearchSchema.parse(location.search).q ?? '') : ''

  const [value, setValue] = useState(urlQuery)
  const [syncedQuery, setSyncedQuery] = useState(urlQuery)
  // URL mudou por fora (voltar no histórico, limpar filtros): o campo acompanha.
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery)
    if (urlQuery !== value.trim()) setValue(urlQuery)
  }

  const commit = useCallback(
    (raw: string, options: { replace: boolean; scroll?: boolean }) => {
      const q = raw.trim() || undefined
      void navigate({
        to: '/',
        search: (prev) => withFilterChange(onHome ? catalogSearchSchema.parse(prev) : {}, { q }),
        replace: options.replace,
        hash: options.scroll ? 'catalogo' : undefined,
        resetScroll: options.scroll ?? false,
      })
    },
    [navigate, onHome],
  )

  useEffect(() => {
    if (!onHome) return
    if (value.trim() === urlQuery) return
    const timer = setTimeout(() => commit(value, { replace: true }), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [value, urlQuery, onHome, commit])

  const submit = useCallback(() => commit(value, { replace: onHome, scroll: !onHome }), [commit, onHome, value])

  return { value, setValue, submit, onHome }
}
