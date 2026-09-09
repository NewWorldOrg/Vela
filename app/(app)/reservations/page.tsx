import type { Metadata } from 'next'

import { RESERVATIONS_EVENT } from '@/repository/events'
import { listReservations } from '@/repository/reservations'
import { RefreshOnSignal } from '@/components/vela/app-signals'
import { ReservationsView } from '@/components/reservations/reservations-page'
import {
  bringBackReservation,
  dropReservation,
  dropReservations,
  raiseReservationPriority,
  reviseReservationDetails,
  throwReservationAway,
  throwReservationsAway,
} from '@/app/(app)/reservations/actions'

export const metadata: Metadata = { title: '予約' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const result = await listReservations({
    show: params.show === 'all' ? 'all' : undefined,
  })

  return (
    <>
      <RefreshOnSignal events={[RESERVATIONS_EVENT]} />
      <ReservationsView
        result={result}
        actions={{
          onCancel: dropReservation,
          onRestore: bringBackReservation,
          onRaise: raiseReservationPriority,
          onRevise: reviseReservationDetails,
          onDiscard: throwReservationAway,
        }}
        bulk={{
          onCancelAll: dropReservations,
          onDiscardAll: throwReservationsAway,
        }}
      />
    </>
  )
}
