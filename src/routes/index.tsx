import { createFileRoute } from '@tanstack/react-router'
import { DEFAULT_TITLE } from '@/components/layout/page-title'
import { HomePage } from '@/features/catalog/components/HomePage'
import { catalogQueryOptions } from '@/features/catalog/queries'
import { catalogSearchSchema, toCatalogQuery } from '@/features/catalog/search'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  loaderDeps: ({ search }) => search,
  // Prefetch sem bloquear a navegação: a troca de filtro é instantânea (dados anteriores ficam
  // esmaecidos) e o primeiro acesso mostra o skeleton em vez de uma tela parada.
  loader: ({ context, deps }) => {
    void context.queryClient.query(catalogQueryOptions(toCatalogQuery(deps))).catch(() => undefined)
  },
  head: () => ({ meta: [{ title: DEFAULT_TITLE }] }),
  component: HomeRoute,
})

function HomeRoute() {
  const search = Route.useSearch()
  return <HomePage search={search} />
}
