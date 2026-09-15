import type { QualityAnomalies, QualityAnomaly } from '@/repository/quality'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/vela/empty-state'
import { MarkDoubleCircle } from '@/components/vela/icons'
import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'
import { QualityChip } from '@/components/quality/signal-quality-chip'

const HEADING = '異常一覧'

const NOTHING = '対象なし'

const NOTHING_UNSETTLED = '解消していない異常はありません。'

const CLASSIFIED = '分類'

function AnomalyRow({ anomaly }: { anomaly: QualityAnomaly }) {
  return (
    <div
      data-slot="anomaly"
      className="-mx-2 border-b border-dashed border-line px-2 py-2 last:border-b-0"
    >
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <b className="text-ui font-bold">{anomaly.title}</b>
        {anomaly.restatedBy ? (
          <Badge variant="mute">{anomaly.restatedBy}</Badge>
        ) : (
          <QualityChip level={anomaly.level}>{anomaly.levelLabel}</QualityChip>
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
  )
}

export function AnomalyList({ anomalies }: { anomalies: QualityAnomalies }) {
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

      {anomalies.items.length > 0 ? (
        <div>
          {anomalies.items.map((anomaly) => (
            <AnomalyRow key={anomaly.id} anomaly={anomaly} />
          ))}
        </div>
      ) : (
        <EmptyState spot={null} title={NOTHING}>
          {NOTHING_UNSETTLED}
        </EmptyState>
      )}
    </Surface>
  )
}
