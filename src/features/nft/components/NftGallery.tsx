import { ZoomIn } from 'lucide-react'
import { useState } from 'react'
import { artworkSrc, artworkSrcSet } from '@/components/common/NftImage'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { NftDetail } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'

/*
 * O Figma mostra quatro miniaturas da mesma arte. Sem outras imagens na API, cada miniatura é um
 * enquadramento diferente da obra (inteira e três detalhes), o que dá sentido à troca da principal.
 */
const VIEWS = [
  { id: 'inteira', label: 'Obra inteira', style: undefined },
  { id: 'rosto', label: 'Detalhe do rosto', style: { transform: 'scale(1.55)', transformOrigin: '50% 30%' } },
  { id: 'acessorios', label: 'Detalhe dos acessórios', style: { transform: 'scale(1.8)', transformOrigin: '50% 88%' } },
  { id: 'fundo', label: 'Recorte central', style: { transform: 'scale(1.25)', transformOrigin: '50% 50%' } },
] as const

export function NftGallery({ nft }: { nft: NftDetail }) {
  const [viewIndex, setViewIndex] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)
  const view = VIEWS[viewIndex] ?? VIEWS[0]

  return (
    <div className="grid grid-cols-[minmax(0,101px)_minmax(0,1fr)] gap-x-[26px]">
      <ul aria-label="Enquadramentos da obra" className="flex flex-col gap-3.5">
        {VIEWS.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              aria-pressed={index === viewIndex}
              aria-label={`Ver ${item.label.toLowerCase()}`}
              onClick={() => setViewIndex(index)}
              className={cn(
                'block aspect-square w-full cursor-pointer overflow-hidden rounded-md border-2 transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent',
                index === viewIndex ? 'border-text-accent' : 'border-transparent hover:border-border-soft',
              )}
            >
              <img
                src={artworkSrc(nft.artwork)}
                alt=""
                width={400}
                height={400}
                loading="lazy"
                decoding="async"
                style={item.style}
                className="size-full bg-surface-raised object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      <div className="relative bg-surface-card p-5">
        <div className="overflow-hidden rounded-lg">
          <img
            src={artworkSrc(nft.artwork, 800)}
            srcSet={artworkSrcSet(nft.artwork)}
            sizes="(min-width: 1280px) 407px, 40vw"
            alt={view.id === 'inteira' ? nft.imageAlt : `${nft.imageAlt} (${view.label.toLowerCase()})`}
            width={800}
            height={800}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            style={view.style}
            className="aspect-square w-full bg-surface-raised object-cover transition-transform duration-300"
          />
        </div>
        <button
          type="button"
          aria-label="Ampliar imagem"
          aria-haspopup="dialog"
          onClick={() => setZoomOpen(true)}
          className="absolute top-2.5 right-2.5 inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-ink/85 text-foreground hover:text-text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent"
        >
          <ZoomIn aria-hidden="true" className="size-[18px]" />
        </button>
      </div>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-[min(92vw,820px)] gap-3 p-4 pt-12 sm:px-4" closeLabel="Fechar imagem ampliada">
          <DialogTitle>{nft.name}</DialogTitle>
          <DialogDescription>{nft.imageAlt}</DialogDescription>
          <img
            src={artworkSrc(nft.artwork, 800)}
            alt={nft.imageAlt}
            width={800}
            height={800}
            className="aspect-square max-h-[calc(100dvh-10rem)] w-full rounded-lg object-contain"
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
