import type { Route } from 'next'
import Link from 'next/link'

import type {
  DetectionScreenResult,
  TunerWriteResult,
} from '@/repository/tuners'
import { signedOut } from '@/lib/signed-out'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/vela/inline-alert'
import { DetectionSave } from '@/components/tuners/detection-save'

const TUNERS_HREF = '/settings/tuners' as Route

const DIFF_VARIANT = {
  add: 'ok',
  del: 'err',
  kind: 'warn',
} as const

function DetectionCard({
  lede,
  children,
  footer,
}: {
  lede?: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-lg bg-surface">
      <div className="px-4 pt-4">
        <h3 className="text-[calc(14.5rem/16)] font-semibold text-ink">
          検出結果の差分
        </h3>
        {lede && <p className="mt-px text-sub text-ink-2">{lede}</p>}
      </div>
      {children}
      <div className="flex flex-wrap items-start justify-end gap-2 px-4 pt-3.5 pb-4">
        {footer}
      </div>
    </div>
  )
}

function CancelDetection() {
  return (
    <Button variant="tone" asChild>
      <Link href={TUNERS_HREF}>キャンセル</Link>
    </Button>
  )
}

export function DetectionPanel({
  detection,
  onSave,
}: {
  detection: DetectionScreenResult
  onSave: (devices: string[]) => Promise<TunerWriteResult>
}) {
  if (detection.state !== 'ok') {
    return (
      <DetectionCard footer={<CancelDetection />}>
        <div className="px-4 py-3">
          <InlineAlert tone="warn">
            {detection.state === 'unauthenticated'
              ? signedOut('デバイスを検出')
              : `デバイスを検出できませんでした。${detection.message}`}
          </InlineAlert>
        </div>
      </DetectionCard>
    )
  }

  const { rows, detected } = detection.detection

  if (rows.length === 0) {
    return (
      <DetectionCard footer={<CancelDetection />}>
        <p className="px-4 py-3 text-ui text-ink-2">
          検出したデバイスは一覧と一致しています。変更はありません。
        </p>
      </DetectionCard>
    )
  }

  const { changes } = detection.detection
  const removes = rows.some((row) => row.kind === 'del')
  const mismatches = rows.some((row) => row.kind === 'kind')

  const notes = changes
    ? []
    : [!mismatches && '保存できる変更がないため、保存はありません。']

  return (
    <DetectionCard
      footer={
        <>
          <CancelDetection />
          {changes && <DetectionSave devices={detected} onSave={onSave} />}
        </>
      }
    >
      <div className="px-4 py-2">
        {rows.map((diff) => (
          <div
            key={`${diff.kind}-${diff.device}`}
            className="flex items-center gap-3 border-b border-hair py-2.5 last:border-b-0"
          >
            <Badge variant={DIFF_VARIANT[diff.kind]} className="font-bold">
              {diff.tag}
            </Badge>
            <span className="min-w-0">
              <span className="block font-code text-sub">{diff.device}</span>
              {diff.name && (
                <span className="block truncate text-sub text-ink-2">
                  {[diff.name, diff.place].filter(Boolean).join(' · ')}
                </span>
              )}
            </span>
            <small className="ml-auto pl-2.5 text-note whitespace-nowrap text-ink-2">
              {diff.note}
            </small>
          </div>
        ))}
      </div>
      <p className="px-4 text-note leading-[1.7] text-ink-2">
        {notes.filter(Boolean).join('')}
      </p>
    </DetectionCard>
  )
}
