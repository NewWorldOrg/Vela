import { Fragment } from 'react'

import type { QualityLevel } from '@/lib/quality'
import type {
  QualityTrend,
  QualityTrendBucket,
  QualityTrendRow,
} from '@/repository/quality'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/vela/empty-state'
import { MarkStar } from '@/components/vela/icons'
import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'
import { LinkSegments } from '@/components/quality/link-segments'

const HEADING = '推移'

const SUBJECT = '対象'

const PROVISIONAL = '暫定'

const NOTHING = '対象なし'

const TALL = 10

type Mark = 'filled' | 'hollow' | 'nothing'

const MARKS: Record<QualityLevel, Mark> = {
  good: 'filled',
  warn: 'filled',
  bad: 'filled',
  unreachable: 'hollow',
  unmeasured: 'nothing',
  nodata: 'nothing',
  unsupported: 'nothing',
}

const FILLS: Record<QualityLevel, string> = {
  good: 'fill-mint',
  warn: 'fill-lemon',
  bad: 'fill-coral',
  unreachable: 'fill-none',
  unmeasured: 'fill-none',
  nodata: 'fill-none',
  unsupported: 'fill-none',
}

function Bucket({
  bucket,
  index,
}: {
  bucket: QualityTrendBucket
  index: number
}) {
  const mark = MARKS[bucket.level]

  return (
    <g data-level={bucket.level}>
      <title>{bucket.says}</title>
      <rect
        x={index}
        y={0}
        width={1}
        height={TALL}
        className="fill-transparent"
      />
      {mark === 'filled' && (
        <rect
          x={index + 0.1}
          y={0}
          width={0.8}
          height={TALL}
          className={FILLS[bucket.level]}
        />
      )}
      {mark === 'hollow' && (
        <rect
          x={index + 0.15}
          y={0.5}
          width={0.7}
          height={TALL - 1}
          className="fill-none stroke-ink-3"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {mark === 'nothing' && (
        <rect
          x={index + 0.1}
          y={TALL / 2 - 0.5}
          width={0.8}
          height={1}
          className="fill-line-strong"
        />
      )}
    </g>
  )
}

function Strip({ row }: { row: QualityTrendRow }) {
  return (
    <svg
      role="img"
      aria-label={`${row.name}の${HEADING}`}
      viewBox={`0 0 ${Math.max(row.buckets.length, 1)} ${TALL}`}
      preserveAspectRatio="none"
      className="block h-3 w-full"
    >
      {row.buckets.map((bucket, index) => (
        <Bucket key={bucket.key} bucket={bucket} index={index} />
      ))}
    </svg>
  )
}

export function QualityTrendPanel({ trend }: { trend: QualityTrend }) {
  return (
    <Surface>
      <SectionHeading mark={MarkStar}>
        {HEADING}
        {trend.provisional && <Badge variant="mute">{PROVISIONAL}</Badge>}
      </SectionHeading>
      <LinkSegments
        label={SUBJECT}
        items={trend.subjects}
        className="mb-3 flex-wrap rounded-[18px]"
      />
      {trend.rows.length > 0 ? (
        <div className="grid grid-cols-[minmax(0,min(8.5rem,30%))_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5">
          {trend.rows.map((row) => (
            <Fragment key={row.key}>
              <span className="truncate text-note text-ink-2">{row.name}</span>
              <Strip row={row} />
            </Fragment>
          ))}
          <span aria-hidden="true" />
          <span className="flex flex-wrap justify-between gap-x-3 font-code text-note tabular-nums text-ink-3">
            <span className="whitespace-nowrap">{trend.from}</span>
            <span className="whitespace-nowrap">{trend.until}</span>
          </span>
        </div>
      ) : (
        <EmptyState spot={null} title={NOTHING} />
      )}
    </Surface>
  )
}
