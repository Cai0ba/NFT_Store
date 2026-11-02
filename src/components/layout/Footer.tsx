import { Link } from '@tanstack/react-router'
import { CircleAlert, Info } from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { z } from 'zod'
import { FacebookGlyphIcon, InstagramIcon, LinkedinIcon, XBrandIcon, YoutubeIcon } from '@/components/common/icons'
import { SimpleTooltip } from '@/components/ui/tooltip'
import type { Category } from '@/shared/contracts'
import { cn } from '@/shared/lib/cn'
import { COMING_SOON, ComingSoon } from './ComingSoon'

const HIGHLIGHTS = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
] as const

const FOOTER_COLLECTIONS: readonly { label: string; category: Category }[] = [
  { label: 'Arte digital', category: 'arte-digital' },
  { label: 'Fotografia', category: 'fotografia' },
  { label: 'Música', category: 'musica' },
  { label: 'Arte 3D', category: 'arte-3d' },
  { label: 'Utilidade', category: 'utilidade' },
]

const HELP_LINKS = ['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item']

const SOCIALS = [
  { label: 'Facebook', icon: FacebookGlyphIcon },
  { label: 'Instagram', icon: InstagramIcon },
  { label: 'X', icon: XBrandIcon },
  { label: 'LinkedIn', icon: LinkedinIcon },
  { label: 'YouTube', icon: YoutubeIcon },
] as const

const linkClass =
  'rounded-xs text-[13px] leading-[30px] text-foreground hover:text-text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent'

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn('container-page pt-24 pb-6', className)}>
      <div className="bg-surface-card">
        <section aria-label="Destaques da Kurio" className="grid gap-y-8 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-12 lg:py-8">
          {HIGHLIGHTS.map((item, index) => (
            <div
              key={item.letter}
              className={cn('flex flex-col lg:px-5', index > 0 && 'lg:border-l lg:border-primary', index === 0 && 'lg:pl-0')}
            >
              <span
                aria-hidden="true"
                className="flex size-[74px] items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground"
              >
                {item.letter}
              </span>
              <h2 className="mt-4 text-[15px] leading-5 font-bold text-foreground">{item.title}</h2>
              <p className="mt-2 max-w-60 text-[13px] leading-[22px] text-text-secondary">{item.text}</p>
            </div>
          ))}
          <Newsletter />
        </section>

        <div className="grid gap-x-6 gap-y-3 bg-surface-band px-6 py-6 text-[13px] leading-5 text-foreground sm:grid-cols-2 lg:grid-cols-4 lg:px-[34px] lg:py-[22px]">
          <p className="text-sm font-bold tracking-[0.1em]">KURIO</p>
          <p className="max-w-56">Feito para colecionadores, criadores e cultura</p>
          <p>
            <a href="mailto:contato@email.com" className="rounded-xs hover:text-text-accent focus-visible:outline-2 focus-visible:outline-text-accent">
              contato@email.com
            </a>
          </p>
          <p>
            <a href="tel:+551140028922" className="rounded-xs hover:text-text-accent focus-visible:outline-2 focus-visible:outline-text-accent">
              +55 11 4002 8922
            </a>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-8 px-6 pt-6 pb-8 lg:grid-cols-4 lg:px-[34px]">
          <FooterColumn title="Meu perfil">
            <li>
              <Link to="/perfil" className={linkClass}>
                Meu perfil
              </Link>
            </li>
            <li>
              <ComingSoon className={linkClass}>Minha coleção</ComingSoon>
            </li>
            <li>
              <ComingSoon className={linkClass}>Atividade</ComingSoon>
            </li>
            <li>
              <ComingSoon className={linkClass}>Estúdio do criador</ComingSoon>
            </li>
            <li>
              <Link to="/perfil/favoritos" className={linkClass}>
                Lista de interesse
              </Link>
            </li>
          </FooterColumn>

          <FooterColumn title="Central de ajuda">
            {HELP_LINKS.map((label) => (
              <li key={label}>
                <ComingSoon className={linkClass}>{label}</ComingSoon>
              </li>
            ))}
          </FooterColumn>

          <FooterColumn title="Coleções">
            {FOOTER_COLLECTIONS.map(({ label, category }) => (
              <li key={category}>
                <Link to="/" search={{ category: [category] }} hash="catalogo" className={linkClass}>
                  {label}
                </Link>
              </li>
            ))}
          </FooterColumn>

          <div>
            <h2 className="text-base leading-6 font-bold text-foreground">Redes sociais</h2>
            <ul className="mt-2.5 flex flex-wrap gap-2.5">
              {SOCIALS.map(({ label, icon: Icon }) => (
                <li key={label}>
                  <SimpleTooltip content={COMING_SOON}>
                    <button
                      type="button"
                      aria-disabled="true"
                      aria-label={`${label} (${COMING_SOON.toLowerCase()})`}
                      className="inline-flex size-8 cursor-not-allowed items-center justify-center rounded-xs border border-text-accent text-text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent"
                    >
                      <Icon className="size-4" />
                    </button>
                  </SimpleTooltip>
                </li>
              ))}
            </ul>
            <h2 className="mt-6 text-base leading-6 font-bold text-foreground">Carteiras compatíveis</h2>
            <p className="mt-2.5 inline-flex rounded-xs bg-surface-band px-2.5 py-1.5 text-[10px] leading-4 font-bold tracking-wide text-text-accent">
              METAMASK · WALLETCONNECT · COINBASE
            </p>
          </div>
        </div>
      </div>
      <p className="mt-6 text-center text-xs leading-4 text-foreground">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-base leading-6 font-bold text-foreground">{title}</h2>
      <ul className="mt-1.5">{children}</ul>
    </div>
  )
}

const emailSchema = z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido')

function Newsletter() {
  const ids = useId()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = emailSchema.safeParse(email)
    if (!parsed.success) {
      setNotice(null)
      setError(parsed.error.issues[0]?.message ?? 'E-mail inválido')
      return
    }
    setError(null)
    // A newsletter não tem backend nesta entrega; dizer "inscrito" seria mentir para o usuário.
    setNotice('Inscrição indisponível na demonstração. Nenhum e-mail foi cadastrado.')
  }

  const describedBy = [`${ids}-hint`, error ? `${ids}-error` : null, notice ? `${ids}-notice` : null].filter(Boolean).join(' ')

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col lg:border-l lg:border-primary lg:pl-3">
      <h2 className="text-[15px] leading-4 font-bold text-foreground">
        <label htmlFor={`${ids}-email`}>Antecipe-se ao próximo lançamento</label>
      </h2>
      <div className="mt-3 flex">
        <input
          id={`${ids}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          placeholder="digite seu e-mail..."
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => {
            setEmail(event.target.value)
            if (error) setError(null)
          }}
          className={cn(
            'h-10 min-w-0 flex-1 rounded-l-xs border border-r-0 border-transparent bg-surface-raised px-3 text-sm text-foreground',
            'placeholder:text-[13px] placeholder:text-secondary focus-visible:border-text-accent focus-visible:outline-none',
            'aria-invalid:border-danger',
          )}
        />
        <button
          type="submit"
          className="h-10 shrink-0 cursor-pointer rounded-r-xs bg-primary px-3.5 text-[15px] font-bold text-primary-foreground hover:bg-text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent"
        >
          Enviar
        </button>
      </div>
      {error ? (
        <p id={`${ids}-error`} className="mt-2 flex items-start gap-1.5 text-xs leading-4 text-danger">
          <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
      <p id={`${ids}-notice`} role="status" className={cn('flex items-start gap-1.5 text-xs leading-4 text-warning', notice && 'mt-2')}>
        {notice ? (
          <>
            <Info aria-hidden="true" className="mt-px size-3.5 shrink-0" />
            {notice}
          </>
        ) : null}
      </p>
      <p id={`${ids}-hint`} className="mt-3 text-xs leading-5 text-text-secondary">
        Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
      </p>
    </form>
  )
}
