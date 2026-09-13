import type { StreamOutcome, StreamVisitRow } from '@/repository/collection'

export const STREAM_OUTCOME_LABEL: Record<StreamOutcome, string> = {
  neverVisited: '未収集',
  complete: '完了',
  basicOnly: '基本のみ',
  incomplete: '不調',
  interrupted: '中断',
  noLock: '選局失敗',
  noBytes: '選局失敗',
}

export function streamLabel(row: StreamVisitRow): string {
  if (row.transportStreamId !== undefined) {
    return `TS ${row.transportStreamId}`
  }

  return row.channelLabel ?? `NID ${row.networkId}`
}
