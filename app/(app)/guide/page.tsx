import type { Metadata } from 'next'
import { cookies } from 'next/headers'

import { forTheGrid, getGuideInTwo } from '@/repository/programs'
import { listBookings } from '@/repository/reservations'
import {
  coverageDaysOf,
  epgHealthOf,
  getCollectionStatus,
} from '@/repository/collection'
import {
  EPG_COLLECTION_EVENT,
  PROGRAMS_EVENT,
  RESERVATIONS_EVENT,
} from '@/repository/events'
import {
  FOLD_SPELLING,
  GUIDE_SUB_CHANNELS_FOLDED,
  flagOf,
} from '@/lib/stored-flag'
import { packedRowsOf } from '@/lib/packed-rows'
import { RefreshOnSignal } from '@/components/vela/app-signals'
import { PackedGuideView } from '@/components/guide/packed-guide'
import {
  boostCollection,
  discardAndRebuildEpg,
  dropProgrammeReservation,
  reserveProgramme,
  readProgramExtras,
  reviseProgrammeReservation,
} from './actions'

export const metadata: Metadata = { title: '番組表' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const jar = await cookies()
  const [{ guide, rest }, collection] = await Promise.all([
    getGuideInTwo(
      typeof params.kind === 'string' ? params.kind : undefined,
      typeof params.date === 'string' ? params.date : undefined,
      listBookings(),
    ),
    getCollectionStatus(),
  ])
  const opening = guide.programs.length > 0 ? guide.programs : await rest
  const later =
    guide.programs.length > 0
      ? rest.then((programs) => packedRowsOf(programs.map(forTheGrid)))
      : undefined

  return (
    <>
      <RefreshOnSignal
        events={[PROGRAMS_EVENT, EPG_COLLECTION_EVENT, RESERVATIONS_EVENT]}
      />
      <PackedGuideView
        guide={{
          ...guide,
          programs: packedRowsOf(opening.map(forTheGrid)),
          health: epgHealthOf(collection, guide.kind),
          coverageDays: coverageDaysOf(collection, guide.kind),
        }}
        rest={later}
        collection={collection}
        onCollectNow={boostCollection}
        onRebuild={discardAndRebuildEpg}
        onReserve={reserveProgramme}
        onCancel={dropProgrammeReservation}
        onRevise={reviseProgrammeReservation}
        onReadExtras={readProgramExtras}
        subChannelsFolded={flagOf(
          jar.get(GUIDE_SUB_CHANNELS_FOLDED)?.value,
          FOLD_SPELLING,
        )}
      />
    </>
  )
}
