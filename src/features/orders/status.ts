import type { OrderStatus } from '@/shared/contracts'

export const isTerminalOrder = (status: OrderStatus) => status === 'confirmed' || status === 'rejected'
