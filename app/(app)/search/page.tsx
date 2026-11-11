import type { Metadata } from 'next'

import { rawSearchConditionOf } from '@/lib/search-condition'
import { searchPrograms } from '@/repository/search'
import { readSingleNotices } from '@/repository/notifications'
import {
  dropProgrammeReservation,
  reserveProgramme,
  restoreProgrammeReservation,
  unwatchProgramme,
  watchProgramme,
} from '../guide/actions'
import { SearchView } from '@/components/search/search-page'

export const metadata: Metadata = { title: '番組検索' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const notices = readSingleNotices()
  const [result, offer] = await Promise.all([
    searchPrograms(rawSearchConditionOf(params), notices.watches),
    notices.offer,
  ])

  return (
    <SearchView
      result={result}
      onReserve={reserveProgramme}
      onCancel={dropProgrammeReservation}
      onRestore={restoreProgrammeReservation}
      noticing={{
        offer,
        onWatch: watchProgramme,
        onUnwatch: unwatchProgramme,
      }}
    />
  )
}
