import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Monta seções abaixo da dobra só quando o navegador fica ocioso ou quando elas se aproximam da tela.
 * No perfil mobile do Lighthouse (CPU 4x mais lenta) renderizar promos, blog e rodapé junto com o
 * catálogo custava centenas de ms de bloqueio na thread principal sem ganho visível.
 * O placeholder reserva altura para que a montagem tardia não desloque nada.
 */
export function DeferredRender({
  children,
  minHeight,
  className,
}: {
  children: ReactNode
  minHeight: number | string
  className?: string
}) {
  const [ready, setReady] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ready) return
    const show = () => setReady(true)

    const observer =
      'IntersectionObserver' in window
        ? new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && show(), {
            rootMargin: '600px 0px',
          })
        : null
    if (anchorRef.current) observer?.observe(anchorRef.current)

    const hasIdle = typeof window.requestIdleCallback === 'function'
    const idle = hasIdle ? window.requestIdleCallback(show, { timeout: 2500 }) : globalThis.setTimeout(show, 1200)

    return () => {
      observer?.disconnect()
      if (hasIdle) window.cancelIdleCallback(idle)
      else globalThis.clearTimeout(idle)
    }
  }, [ready])

  if (ready) return <>{children}</>
  return <div ref={anchorRef} aria-hidden="true" className={className} style={{ minHeight }} />
}
