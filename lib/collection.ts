import type { StreamVisitRow } from '@/repository/collection'

/**
 * How a stream is named: by its identifier once the collector has read one,
 * and by the channel it is tuned to until then.
 */
export function streamLabel(row: StreamVisitRow): string {
  if (row.transportStreamId !== undefined) {
    return `TS ${row.transportStreamId}`
  }

  return row.channelLabel ?? `NID ${row.networkId}`
}
