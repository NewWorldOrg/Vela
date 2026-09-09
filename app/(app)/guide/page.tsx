import type { Metadata } from 'next'

import { getGuide } from '@/repository/programs'
import { listBookings } from '@/repository/reservations'
import { coverageWarningOf, getCollectionStatus } from '@/repository/collection'
import {
  EPG_COLLECTION_EVENT,
  PROGRAMS_EVENT,
  RESERVATIONS_EVENT,
} from '@/repository/events'
import { RefreshOnSignal } from '@/components/vela/app-signals'
import { GuideView } from '@/components/guide/guide-page'
import {
  boostCollection,
  discardAndRebuildEpg,
  dropProgrammeReservation,
  reserveProgramme,
  reviseProgrammeReservation,
} from './actions'

export const metadata: Metadata = { title: '番組表' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const bookings = await listBookings()
  const [guide, collection] = await Promise.all([
    getGuide(
      typeof params.kind === 'string' ? params.kind : undefined,
      typeof params.date === 'string' ? params.date : undefined,
      bookings,
    ),
    getCollectionStatus(),
  ])

  return (
    <>
      <RefreshOnSignal
        events={[PROGRAMS_EVENT, EPG_COLLECTION_EVENT, RESERVATIONS_EVENT]}
      />
      <GuideView
        guide={{
          ...guide,
          coverageWarning: coverageWarningOf(collection, guide.kind),
        }}
        collection={collection}
        onCollectNow={boostCollection}
        onRebuild={discardAndRebuildEpg}
        onReserve={reserveProgramme}
        onCancel={dropProgrammeReservation}
        onRevise={reviseProgrammeReservation}
      />
    </>
  )
}
