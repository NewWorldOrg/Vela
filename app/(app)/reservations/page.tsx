import type { Metadata } from 'next'

import { listReservations } from '@/repository/reservations'
import { ReservationsView } from '@/page-component/reservations/reservations-view'

export const metadata: Metadata = { title: '予約' }

export default async function Page() {
  const reservations = await listReservations()

  return <ReservationsView reservations={reservations} />
}
