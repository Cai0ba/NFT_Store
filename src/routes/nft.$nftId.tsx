import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { pageTitle } from '@/components/layout/page-title'
import { NftDetailPage } from '@/features/nft/components/NftDetailPage'
import { nftDetailQueryOptions } from '@/features/nft/queries'

const detailSearchSchema = z.object({
  edition: z.string().trim().min(1).max(64).optional().catch(undefined),
})

export const Route = createFileRoute('/nft/$nftId')({
  validateSearch: detailSearchSchema,
  // Sem await: o detalhe abre na hora com skeleton; o preload por intenção (hover) costuma já ter os dados.
  loader: ({ context, params }) => {
    void context.queryClient.query(nftDetailQueryOptions(params.nftId)).catch(() => undefined)
  },
  head: () => ({ meta: [{ title: pageTitle('Detalhes do NFT') }] }),
  component: NftRoute,
})

function NftRoute() {
  const { nftId } = Route.useParams()
  const { edition } = Route.useSearch()
  return <NftDetailPage nftId={nftId} edition={edition} />
}
