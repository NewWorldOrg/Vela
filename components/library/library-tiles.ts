'use client'

import { formatClock } from '@/lib/format'
import type { Recording } from '@/repository/recordings'

export interface Picking {
  picked: ReadonlySet<string>
  onPick: (id: string, range: boolean) => void
  said?: ReadonlyMap<string, string>
}

export type PickStarting = (id: string) => void

export function clockOf(recording: Recording): string {
  return formatClock(new Date(recording.startedAt).getTime())
}
