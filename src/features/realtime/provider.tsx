import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { sessionStore, type SessionState } from '@/features/auth/session-store'
import { realtimeStatusStore, startRealtime, type RealtimeStatus } from './client'

export type { RealtimeStatus } from './client'

/** Mantém um socket por sessão: só reabre quando o token muda (login, logout, expiração, outra aba). */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  useEffect(() => {
    let stop: (() => void) | null = null
    let connectedToken: string | null = null

    const sync = (session: SessionState) => {
      if (session.status === 'loading') return
      if (stop && session.token === connectedToken) return
      stop?.()
      connectedToken = session.token
      stop = startRealtime({ queryClient, token: session.token, userId: session.user?.id ?? null })
    }

    sync(sessionStore.getState())
    const unsubscribe = sessionStore.subscribe((next) => sync(next))
    return () => {
      unsubscribe()
      stop?.()
    }
  }, [queryClient])

  return children
}

export function useRealtimeStatus(): RealtimeStatus {
  return useSyncExternalStore(realtimeStatusStore.subscribe, realtimeStatusStore.getStatus, realtimeStatusStore.getStatus)
}
