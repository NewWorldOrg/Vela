import type { StreamVisitRow } from '@/repository/collection'

export function streamLabel(row: StreamVisitRow): string {
  if (row.transportStreamId !== undefined) {
    return `TS ${row.transportStreamId}`
  }

  return row.channelLabel ?? `NID ${row.networkId}`
}
