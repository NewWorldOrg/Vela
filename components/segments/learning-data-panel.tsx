import type { ReactNode } from 'react'

import { formatBytes, formatHours } from '@/lib/format'
import { SYSTEM_STATE_LABELS } from '@/lib/system-terms'
import type { LearningData } from '@/repository/segment-status'
import type { Reading } from '@/repository/system'
import { StatusText } from '@/components/vela/status'
import { Surface } from '@/components/vela/surface'

function Row({ name, children }: { name: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-ink-3">{name}</dt>
      <dd className="min-w-0 font-code tabular-nums text-ink-2">{children}</dd>
    </>
  )
}

export function LearningDataPanel({
  reading,
}: {
  reading: Reading<LearningData>
}) {
  if (reading.state !== 'ok') {
    return (
      <Surface data-slot="learning-data" className="bg-surface-2">
        <StatusText tone="off" className="text-ui">
          {reading.state === 'unauthenticated'
            ? SYSTEM_STATE_LABELS.signedOut
            : SYSTEM_STATE_LABELS.unknown}
        </StatusText>
      </Surface>
    )
  }

  const data = reading.value

  return (
    <Surface data-slot="learning-data">
      <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-5 gap-y-2.5 text-ui">
        <Row name="データのある録画">{data.recordings} 件</Row>
        <Row name="時間">{formatHours(data.seconds)}</Row>
        <Row name="大きさ">{formatBytes(data.bytes)}</Row>
        {data.waiting > 0 && <Row name="取り出し待ち">{data.waiting} 件</Row>}
      </dl>
    </Surface>
  )
}
