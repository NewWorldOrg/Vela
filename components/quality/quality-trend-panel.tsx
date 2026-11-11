'use client'

import type { QualityTrend } from '@/repository/quality'
import { EmptyState } from '@/components/vela/empty-state'
import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'
import { SegmentedControl } from '@/components/vela/segmented-control'
import { chosenOf, segmentsOf } from '@/components/quality/window-segments'
import { FIGURES, HEADING, Row } from '@/components/quality/row'

const SUBJECT = '対象'

const NOTHING = '対象がありません'

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
    <Surface className="px-4 @container/trend">
      <SectionHeading>{HEADING}</SectionHeading>
      <SegmentedControl
        aria-label={SUBJECT}
        options={segmentsOf(trend.subjects)}
        value={chosenOf(trend.subjects)}
        className="mb-3"
      />
      {trend.rows.length > 0 ? (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 @[34rem]/trend:gap-x-3 @[34rem]/trend:grid-cols-[minmax(0,min(8.5rem,30%))_minmax(0,1fr)_auto]">
          {trend.rows.map((row) => (
            <Row key={row.key} row={row} trend={trend} />
          ))}
          <span aria-hidden="true" className="hidden @[34rem]/trend:block" />
          <Axis trend={trend} />
          <span aria-hidden="true" />
        </div>
      ) : (
        <EmptyState usher={null} title={NOTHING} />
      )}
    </Surface>
  )
}
