import type { CatalogSearch } from '@/features/catalog/search'
import type { ArtworkKey } from '@/shared/contracts'

/*
 * Textos editoriais da Início (hero, vitrines e blog). São conteúdo de marketing da interface, não
 * dados do catálogo: nada aqui tem preço, estoque ou id de NFT.
 */

export const HERO = {
  eyebrow: 'Bem-vindo à Kurio',
  title: ['Seja dono do futuro', 'da arte digital'],
  mobileTitle: ['Seja dono da', 'cultura digital'],
  description:
    'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.',
  mobileDescription: 'Descubra NFTs selecionados de criadores do mundo todo.',
  cta: 'Explorar',
  artwork: 'emerald' as ArtworkKey,
  secondaryArtwork: 'sage' as ArtworkKey,
  imageAlt: 'Ilustração de um macaco com óculos redondos e jaqueta college verde, arte em destaque da Kurio',
}

export interface Promo {
  id: string
  title: string
  description: string
  artwork: ArtworkKey
  imageAlt: string
  /** Filtro real do catálogo aplicado pelo botão "Explorar". */
  filter: Omit<Partial<CatalogSearch>, 'page'>
}

export const PROMOS: readonly Promo[] = [
  {
    id: 'genesis',
    title: 'Lançamentos gênesis de edição limitada',
    description: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    artwork: 'emerald',
    imageAlt: 'Macaco de óculos e jaqueta verde, ilustração da vitrine de lançamentos',
    filter: { tab: 'novos' },
  },
  {
    id: 'arte-digital',
    title: 'Arte digital selecionada e muito mais',
    description: 'Explore novos artistas, coleções verificadas e obras digitais que definem a nova geração.',
    artwork: 'ivory',
    imageAlt: 'Macaco de blazer claro e gola alta verde, ilustração da vitrine de arte digital',
    filter: { category: ['arte-digital'] },
  },
]

export interface BlogPost {
  id: string
  date: string
  readingTime: string
  title: string
  excerpt: string
  artwork: ArtworkKey
}

export const BLOG = {
  title: 'Diário da Cunhagem',
  description: 'Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.',
  posts: [
    {
      id: 'propriedade',
      date: '12 de setembro',
      readingTime: 'Leitura de 6 min',
      title: 'Como funciona a propriedade de NFTs',
      excerpt: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
      artwork: 'ivory',
    },
    {
      id: 'artistas',
      date: '13 de setembro',
      readingTime: 'Leitura de 2 min',
      title: '10 artistas digitais para acompanhar',
      excerpt: 'Conheça criadores que moldam a cultura digital.',
      artwork: 'emerald',
    },
    {
      id: 'raridade',
      date: '15 de setembro',
      readingTime: 'Leitura de 3 min',
      title: 'Raridade, atributos e procedência',
      excerpt: 'Entenda raridade, procedência, direitos autorais e utilidade.',
      artwork: 'sage',
    },
    {
      id: 'carteira',
      date: '15 de setembro',
      readingTime: 'Leitura de 2 min',
      title: 'Como proteger sua carteira',
      excerpt: 'Proteja sua carteira, seus ativos e sua identidade.',
      artwork: 'golden',
    },
  ] satisfies BlogPost[],
}
