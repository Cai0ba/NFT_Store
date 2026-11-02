import { WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRealtimeStatus } from '@/features/realtime/provider'

/**
 * Só aparece depois de uma conexão bem-sucedida cair: preços e status de pedido podem estar
 * defasados até a reconexão, e quem está no carrinho ou no checkout precisa saber disso.
 * O atraso evita piscar em quedas de poucos segundos que o socket resolve sozinho.
 */
export function RealtimeStatusPill() {
  const status = useRealtimeStatus()
  const [everConnected, setEverConnected] = useState(false)
  const [delayElapsed, setDelayElapsed] = useState(false)

  if (status === 'connected' && !everConnected) setEverConnected(true)
  const offline = everConnected && (status === 'reconnecting' || status === 'disconnected')
  if (!offline && delayElapsed) setDelayElapsed(false)

  useEffect(() => {
    if (!offline) return
    const timer = window.setTimeout(() => setDelayElapsed(true), 1500)
    return () => window.clearTimeout(timer)
  }, [offline])

  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-3 z-[65] flex justify-center px-4">
      {offline && delayElapsed ? (
        <p className="rounded-pill border-warning/50 bg-surface-card text-foreground shadow-card pointer-events-auto inline-flex items-center gap-2 border px-4 py-2 text-xs">
          <WifiOff aria-hidden="true" className="text-warning size-4" />
          Atualizações em tempo real pausadas. Tentando reconectar…
        </p>
      ) : null}
    </div>
  )
}
