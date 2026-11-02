import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export type BreadcrumbItem = { label: string; href?: string }

export type BreadcrumbLinkProps = { href: string; className: string; children: ReactNode }

type BreadcrumbsProps = {
  items: readonly BreadcrumbItem[]
  /** Para usar o Link do router; o padrão é um <a> simples. */
  renderLink?: (item: BreadcrumbItem, props: BreadcrumbLinkProps) => ReactNode
  className?: string
}

const linkClass =
  'rounded-xs hover:text-text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-accent'

export function Breadcrumbs({ items, renderLink, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Trilha de navegação" className={cn('min-w-0', className)}>
      <ol className="flex flex-wrap items-center gap-x-1.5 font-mono text-sm leading-5 font-bold text-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const props: BreadcrumbLinkProps | null = item.href && !isLast
            ? { href: item.href, className: linkClass, children: item.label }
            : null
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-x-1.5">
              {props ? (
                renderLink ? renderLink(item, props) : <a {...props} />
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className="truncate">
                  {item.label}
                </span>
              )}
              {isLast ? null : <span aria-hidden="true">/</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
