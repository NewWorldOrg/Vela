'use client'

import { formatClock } from '@/lib/format'
import type { Recording } from '@/repository/recordings'

/** A picked recording's set, and the press that changes it, while the library is choosing: `range` when Shift was held. */
export interface Picking {
  picked: ReadonlySet<string>
  onPick: (id: string, range: boolean) => void
  /** Why a recording's thumbnail was not made again by `サムネイルを再生成`, by its id, said under its title. */
  said?: ReadonlyMap<string, string>
}

/** On a mouse's screen while the library is not choosing: starts it with the one recording whose check was pressed. */
export type PickStarting = (id: string) => void

export function clockOf(recording: Recording): string {
  return formatClock(new Date(recording.startedAt).getTime())
}
