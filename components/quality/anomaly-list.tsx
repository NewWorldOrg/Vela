'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import type {
  QualityAnomalies,
  QualityAnomaly,
  QualityWrite,
} from '@/repository/quality'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { InlineAlert } from '@/components/vela/banner'
import { EmptyState } from '@/components/vela/empty-state'
import { MarkDoubleCircle } from '@/components/vela/icons'
import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'
import { QualityChip } from '@/components/quality/signal-quality-chip'

export type QualityAcknowledge = (id: string) => Promise<QualityWrite>

const HEADING = '異常一覧'

const ACKNOWLEDGE = '確認済みにする'

const ACKNOWLEDGED = '確認済み'

const ALSO_ACKNOWLEDGED = '確認済みも表示'

const ALSO_ACKNOWLEDGED_ID = 'anomalies-also-acknowledged'

const NOTHING = '対象なし'

const NOTHING_UNSETTLED = '解消していない異常はありません。'

const NOTHING_UNACKNOWLEDGED = '確認していない異常はありません。'

const SIGNED_OUT = 'サインインが切れているため、確認済みにできませんでした。'

const CLASSIFIED = '分類'

function AnomalyRow({
  anomaly,
  onAcknowledge,
}: {
  anomaly: QualityAnomaly
  onAcknowledge: () => void
}) {
  return (
    <div
      data-slot="anomaly"
      className={cn(
        '-mx-2 flex items-start gap-2.5 border-b border-dashed border-line px-2 py-2 last:border-b-0',
        anomaly.acknowledged && 'rounded-md bg-surface-2',
      )}
    >
      <div className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <b className="text-ui font-bold">{anomaly.title}</b>
          {anomaly.restatedBy ? (
            <Badge variant="mute">{anomaly.restatedBy}</Badge>
          ) : (
            <QualityChip level={anomaly.level}>
              {anomaly.levelLabel}
            </QualityChip>
          )}
          {anomaly.acknowledged && (
            <Badge variant="secondary">{ACKNOWLEDGED}</Badge>
          )}
        </span>
        <span className="mt-0.5 block text-note text-ink-2">
          {anomaly.subject} · {anomaly.observed} / {anomaly.applied}
        </span>
        {anomaly.classification && (
          <span className="block text-note text-ink-2">
            {CLASSIFIED} {anomaly.classification}
          </span>
        )}
        <span className="mt-1 block font-code text-note tabular-nums text-ink-3">
          {anomaly.when}
        </span>
      </div>
      {anomaly.asks && (
        <Button variant="ghost" size="sm" onClick={onAcknowledge}>
          {ACKNOWLEDGE}
        </Button>
      )}
    </div>
  )
}

export function AnomalyList({
  anomalies,
  onAcknowledge,
}: {
  anomalies: QualityAnomalies
  onAcknowledge: QualityAcknowledge
}) {
  const router = useRouter()
  const [shown, showAsIf] = useOptimistic(
    anomalies.items,
    (rows: QualityAnomaly[], id: string) =>
      rows.map((row) =>
        row.id === id ? { ...row, acknowledged: true, asks: false } : row,
      ),
  )
  const [alsoAcknowledged, showAlsoAsIf] = useOptimistic(
    anomalies.showsAcknowledged,
    (_: boolean, next: boolean) => next,
  )
  const [refusal, setRefusal] = useState<string>()
  const [, startTransition] = useTransition()

  const acknowledge = (id: string) => {
    setRefusal(undefined)

    startTransition(async () => {
      showAsIf(id)

      const result = await onAcknowledge(id)

      if (result.state === 'unauthenticated') {
        setRefusal(SIGNED_OUT)
      }

      if (result.state === 'rejected') {
        setRefusal(result.message)
      }
    })
  }

  const alsoShow = (next: boolean) => {
    startTransition(() => {
      showAlsoAsIf(next)
      router.replace(anomalies.href)
    })
  }

  return (
    <Surface>
      <SectionHeading mark={MarkDoubleCircle}>
        {HEADING}
        {anomalies.owned > 0 && (
          <QualityChip level="bad">所有 {anomalies.owned} 件</QualityChip>
        )}
        {anomalies.restated > 0 && (
          <Badge variant="mute">再掲 {anomalies.restated} 件</Badge>
        )}
      </SectionHeading>

      {shown.length > 0 ? (
        <div>
          {shown.map((anomaly) => (
            <AnomalyRow
              key={anomaly.id}
              anomaly={anomaly}
              onAcknowledge={() => acknowledge(anomaly.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState spot={null} title={NOTHING}>
          {alsoAcknowledged ? NOTHING_UNSETTLED : NOTHING_UNACKNOWLEDGED}
        </EmptyState>
      )}

      <span aria-live="polite">
        {refusal && (
          <InlineAlert tone="warn" className="mt-3">
            {refusal}
          </InlineAlert>
        )}
      </span>

      <div className="mt-3 flex items-center gap-2.5 border-t border-dashed border-line pt-3">
        <Switch
          id={ALSO_ACKNOWLEDGED_ID}
          checked={alsoAcknowledged}
          onCheckedChange={alsoShow}
        />
        <label
          htmlFor={ALSO_ACKNOWLEDGED_ID}
          className="cursor-pointer text-note text-ink-2"
        >
          {ALSO_ACKNOWLEDGED}
        </label>
      </div>
    </Surface>
  )
}
