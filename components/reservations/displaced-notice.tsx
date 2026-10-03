import type { ConflictEntry } from '@/repository/reservations'
import { InlineAlert } from '@/components/vela/banner'
import { ConflictEntries } from '@/components/reservations/conflict-entries'

export const DISPLACED = '次の予約が競合になりました。'

export function DisplacedNotice({
  entries,
}: {
  entries: readonly ConflictEntry[] | undefined
}) {
  if (!entries || entries.length === 0) {
    return null
  }

  return (
    <InlineAlert tone="warn" data-slot="displaced">
      {DISPLACED}
      <ConflictEntries entries={entries} className="mt-2" />
    </InlineAlert>
  )
}
