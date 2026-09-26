'use client'

import { plotTrend } from '@/lib/quality-trend'
import type { QualityTrend, QualityTrendRow } from '@/repository/quality'
import { EmptyState } from '@/components/vela/empty-state'
import { MarkStar } from '@/components/vela/icons'
import { InFull } from '@/components/vela/in-full'
import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'
import { LinkSegments } from '@/components/quality/link-segments'

const HEADING = '推移'

const SUBJECT = '対象'

const NOTHING = '対象なし'

const TALL = 'h-[calc(56rem/16)]'

const FIGURES = 'font-code text-note tabular-nums text-ink-3'

function Row({ row, trend }: { row: QualityTrendRow; trend: QualityTrend }) {
  const plot = plotTrend(row.buckets, trend.from, trend.until, row.line?.value)

  return (
    <>
      <InFull says={row.name}>
        <span className="truncate text-note text-ink-2">{row.name}</span>
      </InFull>
      <svg
        role="img"
        aria-label={`${row.name}の${HEADING}`}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className={`block w-full overflow-visible ${TALL}`}
      >
        <line
          x1={0}
          x2={100}
          y1={100}
          y2={100}
          className="stroke-line"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        {trend.ticks.map((tick) => (
          <line
            key={tick.x}
            x1={tick.x}
            x2={tick.x}
            y1={0}
            y2={100}
            className="stroke-line"
            strokeWidth={1}
            strokeDasharray="1 3"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {plot.line !== undefined && (
          <line
            data-slot="threshold"
            x1={0}
            x2={100}
            y1={plot.line}
            y2={plot.line}
            className="stroke-ink-3"
            strokeWidth={1}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {plot.risers.map((riser) => (
          <line
            key={riser.x}
            data-slot="riser"
            x1={riser.x}
            x2={riser.x}
            y1={riser.from}
            y2={riser.to}
            className="stroke-ink-2"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {plot.steps.map((step) => (
          <line
            key={step.x1}
            data-slot="step"
            data-over={step.over || undefined}
            x1={step.x1}
            x2={step.x2}
            y1={step.y}
            y2={step.y}
            className={step.over ? 'stroke-coral' : 'stroke-ink-2'}
            strokeWidth={2}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {row.buckets.map((bucket, index) => (
          <g key={bucket.key} data-level={bucket.level}>
            <title>{bucket.says}</title>
            <rect
              x={plot.columns[index].x}
              y={0}
              width={plot.columns[index].width}
              height={100}
              className="fill-transparent"
            />
          </g>
        ))}
      </svg>
      <span
        className={`relative block ${TALL} ${FIGURES}`}
        style={{ width: `${row.line?.says.length ?? 0}ch` }}
      >
        {row.line && (
          <span
            className="absolute left-0 -translate-y-1/2 whitespace-nowrap"
            style={{ top: `${plot.line}%` }}
          >
            {row.line.says}
          </span>
        )}
      </span>
    </>
  )
}

function Axis({ trend }: { trend: QualityTrend }) {
  return (
    <span className={`@container relative block h-[calc(18rem/16)] ${FIGURES}`}>
      <span className="absolute left-0 whitespace-nowrap">{trend.opens}</span>
      {trend.ticks.map((tick) => (
        <span
          key={tick.x}
          className="absolute -translate-x-1/2 overflow-hidden whitespace-nowrap"
          style={{
            left: `${tick.x}%`,
            maxWidth: `clamp(0px, (100cqw - ${tick.room}ch) * 999, ${tick.says.length}ch)`,
          }}
        >
          {tick.says}
        </span>
      ))}
      <span className="absolute right-0 whitespace-nowrap">{trend.closes}</span>
    </span>
  )
}

export function QualityTrendPanel({ trend }: { trend: QualityTrend }) {
  return (
    <Surface>
      <SectionHeading mark={MarkStar}>{HEADING}</SectionHeading>
      <LinkSegments
        label={SUBJECT}
        items={trend.subjects}
        className="mb-3 flex-wrap gap-y-[calc(13rem/16)] rounded-[18px]"
      />
      {trend.rows.length > 0 ? (
        <div className="grid grid-cols-[minmax(0,min(8.5rem,30%))_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
          {trend.rows.map((row) => (
            <Row key={row.key} row={row} trend={trend} />
          ))}
          <span aria-hidden="true" />
          <Axis trend={trend} />
          <span aria-hidden="true" />
        </div>
      ) : (
        <EmptyState spot={null} title={NOTHING} />
      )}
    </Surface>
  )
}
