import type { Metadata } from 'next'

import { listRecordings, type RecordingsFilter } from '@/repository/recordings'
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
    <LibraryView
      result={result}
      filter={result.filter}
      onDelete={throwRecordingAway}
    />
  )
}
