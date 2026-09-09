import type { Metadata } from 'next'

import {
  ENCODE_JOBS_EVENT,
  QUALITY_EVENT,
  RECORDINGS_EVENT,
} from '@/repository/events'
import { listRecordings, type RecordingsFilter } from '@/repository/recordings'
import { RefreshOnSignal } from '@/components/vela/app-signals'
import { LibraryView } from '@/components/library/library-page'
import { throwRecordingAway } from '@/app/(app)/library/actions'

export const metadata: Metadata = { title: 'ライブラリ' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filter: RecordingsFilter = {
    q: typeof params.q === 'string' ? params.q : undefined,
    year: typeof params.year === 'string' ? params.year : undefined,
    genre: typeof params.genre === 'string' ? params.genre : undefined,
    state: typeof params.state === 'string' ? params.state : undefined,
    ch: typeof params.ch === 'string' ? params.ch : undefined,
  }
  const result = await listRecordings(filter)

  return (
    <>
      <RefreshOnSignal
        events={[RECORDINGS_EVENT, ENCODE_JOBS_EVENT, QUALITY_EVENT]}
      />
      <LibraryView
        result={result}
        filter={result.filter}
        onDelete={throwRecordingAway}
      />
    </>
  )
}
