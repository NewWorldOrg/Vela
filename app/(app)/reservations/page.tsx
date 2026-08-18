import type { Metadata } from 'next'

import { listReservations } from '@/repository/reservations'
import { ReservationsView } from '@/components/reservations/reservations-page'

export const metadata: Metadata = { title: '予約' }

export default async function Page() {
  const reservations = await listReservations()

  return <ReservationsView reservations={reservations} />
}
