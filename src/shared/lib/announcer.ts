import { useSyncExternalStore } from 'react'

/**
 * Fila mínima para mensagens de leitor de tela (aria-live). Hooks de dados e de UI publicam aqui;
 * o <LiveAnnouncer /> do layout é o único consumidor.
 */
type Politeness = 'polite' | 'assertive'
type Announcement = { id: number; message: string; politeness: Politeness }

let current: Announcement | null = null
let seq = 0
const listeners = new Set<() => void>()

export function announce(message: string, politeness: Politeness = 'polite') {
  seq += 1
  current = { id: seq, message, politeness }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAnnouncement() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  )
}
