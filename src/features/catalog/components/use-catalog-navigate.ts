import { useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import type { CatalogSearch } from '@/features/catalog/search'

/**
 * Filtros, abas, ordenação e página entram no histórico (push): o "voltar" do navegador desfaz o
 * último filtro. Só a digitação da busca usa replace. A rolagem fica onde está.
 */
export function useCatalogNavigate() {
  const navigate = useNavigate()
  return useCallback(
    (search: CatalogSearch, options: { replace?: boolean } = {}) =>
      void navigate({ to: '/', search, replace: options.replace, resetScroll: false }),
    [navigate],
  )
}
