import { useAnnouncement } from '@/shared/lib/announcer'

/**
 * Regiões aria-live fixas no layout, presentes desde o primeiro render (regiões criadas junto com a
 * mensagem costumam ser ignoradas). A `key` pelo id troca o nó a cada anúncio, então mensagens iguais
 * em sequência (duas adições do mesmo NFT) também são lidas.
 */
export function LiveAnnouncer() {
  const announcement = useAnnouncement()
  const message = (politeness: 'polite' | 'assertive') =>
    announcement?.politeness === politeness ? <span key={announcement.id}>{announcement.message}</span> : null

  return (
    <div className="sr-only">
      <div role="status" aria-live="polite" aria-atomic="true">
        {message('polite')}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true">
        {message('assertive')}
      </div>
    </div>
  )
}
