import { cn } from '@/shared/lib/cn'

export function truncateAddress(address: string, head = 6, tail = 4) {
  if (address.length <= head + tail + 1) return address
  return `${address.slice(0, head)}…${address.slice(-tail)}`
}

type EthAddressProps = {
  address: string
  head?: number
  tail?: number
  className?: string
}

/** Endereço truncado (0xA91F…E82C); o valor completo fica no title e no atributo value para cópia. */
export function EthAddress({ address, head, tail, className }: EthAddressProps) {
  return (
    <data value={address} title={address} translate="no" className={cn('font-mono whitespace-nowrap tabular-nums', className)}>
      {truncateAddress(address, head, tail)}
    </data>
  )
}
