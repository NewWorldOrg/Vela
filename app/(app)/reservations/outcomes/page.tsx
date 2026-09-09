import type { Metadata } from 'next'

import { RESERVATIONS_EVENT } from '@/repository/events'
import type { ReservationOutcomeKind } from '@/repository/reservation-outcomes'
import { listReservationOutcomes } from '@/repository/reservation-outcomes'
import { RefreshOnSignal } from '@/components/vela/app-signals'
import { OutcomeLedgerView } from '@/components/reservations/outcomes-page'

export const metadata: Metadata = { title: '予約結果台帳' }

function only(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const page = Number(only(params.page))
  const result = await listReservationOutcomes({
    kind: only(params.kind) as ReservationOutcomeKind | undefined,
    days: only(params.days),
    ch: only(params.ch),
    rule: only(params.rule),
    page: Number.isSafeInteger(page) && page >= 1 ? page : undefined,
  })

  return (
    <>
      <RefreshOnSignal events={[RESERVATIONS_EVENT]} />
      <OutcomeLedgerView result={result} />
    </>
  )
}
