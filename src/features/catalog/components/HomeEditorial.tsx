import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { ComingSoon } from '@/components/layout/ComingSoon'
import { artworkSrc } from '@/components/common/NftImage'
import { Button } from '@/components/ui/button'
import { withFilterChange } from '@/features/catalog/search'
import { BLOG, PROMOS } from './editorial'

export function PromoSection() {
  return (
    <section aria-label="Vitrines" className="container-page mt-16 md:mt-24">
      <ul className="grid gap-5 lg:grid-cols-2 lg:gap-[30px]">
        {PROMOS.map((promo) => (
          <li key={promo.id} className="flex min-h-[200px] overflow-hidden bg-surface-card md:min-h-[248px]">
            <img
              src={artworkSrc(promo.artwork)}
              width={400}
              height={400}
              alt={promo.imageAlt}
              loading="lazy"
              decoding="async"
              className="w-[42%] max-w-[286px] shrink-0 rounded-lg bg-surface-raised object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col items-end justify-center gap-3 px-4 py-5 text-right md:px-6">
              <h2 className="max-w-[260px] text-[15px] leading-5 font-bold text-foreground md:text-base">{promo.title}</h2>
              <p className="max-w-[260px] text-[13px] leading-[22px] text-text-secondary">{promo.description}</p>
              <Button asChild size="sm" className="mt-1 h-9 gap-1.5 px-4 text-[13px]">
                <Link to="/" search={withFilterChange({}, promo.filter)} hash="catalogo">
                  Explorar
                  <ArrowRight aria-hidden="true" />
                  <span className="sr-only">: {promo.title}</span>
                </Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function BlogSection() {
  return (
    <section aria-labelledby="blog-titulo" className="container-page mt-16 md:mt-24">
      <div className="text-center">
        <h2 id="blog-titulo" className="text-2xl leading-8 font-bold text-foreground md:text-[28px] md:leading-9">
          {BLOG.title}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-[13px] leading-5 text-text-secondary">{BLOG.description}</p>
      </div>
      <ul className="relative -mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-auto sm:grid sm:max-w-[1138px] sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 lg:gap-[22px] [&::-webkit-scrollbar]:hidden">
        {BLOG.posts.map((post) => (
          <li key={post.id} className="w-[78%] shrink-0 snap-start sm:w-auto">
            <article className="flex h-full flex-col overflow-hidden rounded-sm bg-surface-card">
              <img
                src={artworkSrc(post.artwork)}
                width={400}
                height={284}
                alt=""
                loading="lazy"
                decoding="async"
                className="aspect-[268/190] w-full rounded-sm bg-surface-raised object-cover object-top"
              />
              <div className="flex flex-1 flex-col px-2.5 pt-3 pb-3">
                <p className="text-[11px] leading-4 text-text-secondary">
                  <time>{post.date}</time>
                  <span aria-hidden="true"> &nbsp;|&nbsp; </span>
                  <span className="sr-only">, </span>
                  {post.readingTime}
                </p>
                <h3 className="mt-2.5 text-[15px] leading-5 font-bold text-foreground">{post.title}</h3>
                <p className="mt-2.5 flex-1 text-xs leading-4 text-text-secondary">{post.excerpt}</p>
                <ComingSoon className="mt-2.5 self-start rounded-xs text-xs font-bold text-text-accent">
                  Ler mais <span aria-hidden="true">→</span>
                  <span className="sr-only">: {post.title}</span>
                </ComingSoon>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
