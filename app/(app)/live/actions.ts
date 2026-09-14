'use server'

import { takeLiveTicket } from '@/repository/live'
import type { TicketWrite } from '@/repository/tickets'

export async function takeTicket(
  networkId: number,
  serviceId: number,
): Promise<TicketWrite> {
  return takeLiveTicket(networkId, serviceId)
}
