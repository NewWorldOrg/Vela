import { formatBytes, formatHours } from '@/lib/format'
import { repeatedSoundsOf } from '@/lib/segment-detection'
import type { LearningData, SegmentCatalog } from '@/repository/segment-status'
import { Surface } from '@/components/vela/surface'
import { ValueRow, ValueRows } from '@/components/segments/value-rows'

export const LEARNING_DATA_SLOT = 'learning-data'

export function LearningDataPanel({
  data,
  catalog,
}: {
  data: LearningData
  catalog: SegmentCatalog
}) {
  return (
    <Surface data-slot={LEARNING_DATA_SLOT}>
      <ValueRows>
        <ValueRow name="データのある録画">{data.recordings} 件</ValueRow>
        <ValueRow name="時間">{formatHours(data.seconds)}</ValueRow>
        <ValueRow name="大きさ">{formatBytes(data.bytes)}</ValueRow>
        {data.waiting > 0 && (
          <ValueRow name="取り出し待ち">{data.waiting} 件</ValueRow>
        )}
        <ValueRow name="繰り返し出る音">{repeatedSoundsOf(catalog)}</ValueRow>
      </ValueRows>
    </Surface>
  )
}
