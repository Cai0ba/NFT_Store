import { Link2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { LinkedinIcon, XBrandIcon } from '@/components/common/icons'
import type { NftDetail } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'

const iconClass = cn(
  'inline-flex size-7 items-center justify-center rounded-xs text-foreground transition-colors hover:text-text-accent',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent',
)

export function ShareNft({ nft, className }: { nft: NftDetail; className?: string }) {
  const url = `${window.location.origin}/nft/${encodeURIComponent(nft.id)}`
  const text = `${nft.name} na Kurio`
  const enc = encodeURIComponent

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado', { description: url })
    } catch {
      toast.error('Não foi possível copiar o link', { description: url })
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
      <h2 id="compartilhar" className="text-sm leading-6 font-bold text-foreground">
        Compartilhar este NFT:
      </h2>
      <ul aria-labelledby="compartilhar" className="flex items-center gap-0.5">
        <li>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Compartilhar no LinkedIn (abre em nova aba)"
            className={iconClass}
          >
            <LinkedinIcon />
          </a>
        </li>
        <li>
          <a href={`mailto:?subject=${enc(text)}&body=${enc(`${text}: ${url}`)}`} aria-label="Compartilhar por e-mail" className={iconClass}>
            <Mail aria-hidden="true" className="size-[18px]" />
          </a>
        </li>
        <li>
          <a
            href={`https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Compartilhar no X (abre em nova aba)"
            className={iconClass}
          >
            <XBrandIcon />
          </a>
        </li>
        <li>
          <button type="button" onClick={() => void copy()} aria-label="Copiar link do NFT" className={cn(iconClass, 'cursor-pointer')}>
            <Link2 aria-hidden="true" className="size-[18px]" />
          </button>
        </li>
      </ul>
    </div>
  )
}
