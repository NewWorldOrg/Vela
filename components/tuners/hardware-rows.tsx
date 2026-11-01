import type { ReactNode } from 'react'

import type {
  CardReaderRow,
  DriverFacts,
  DriverLink,
  StatusLine,
  StatusTone,
  TunerRow,
} from '@/repository/tuners'
import { EMPTY_VALUE } from '@/lib/empty-value'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { InFull } from '@/components/vela/in-full'
import { ChipDot } from '@/components/vela/status'
import { tipBoxOf } from '@/components/recordings/status-cell'

const CHIP_VARIANT: Record<
  Exclude<StatusTone, 'plain'>,
  'recording' | 'err' | 'warn'
> = {
  rec: 'recording',
  err: 'err',
  warn: 'warn',
}

const KIND_SAID: Record<NonNullable<TunerRow['kind']>, string> = {
  地上波: '地上波',
  衛星: 'BS・CS',
}

/** One line of a hardware group: what it is at the left, how it stands in the middle, its switches at the right. */
export function HardwareLine({
  id,
  title,
  code = false,
  sub,
  status,
  why,
  controls,
}: {
  id?: string
  title: string
  code?: boolean
  sub?: string
  status: StatusLine
  why?: string
  controls?: ReactNode
}) {
  return (
    <div
      id={id}
      data-slot="hardware-line"
      className={cn(
        '@container/line relative',
        'before:absolute before:top-0 before:right-0 before:left-4 before:h-px before:bg-hair first:before:hidden',
      )}
    >
      <div
        className={cn(
          'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3',
          '@[36rem]/line:grid-cols-[minmax(0,1fr)_calc(200rem/16)_calc(148rem/16)]',
        )}
      >
        <div className="min-w-0">
          <p
            className={cn(
              'truncate text-[calc(14.5rem/16)] leading-5 font-medium text-ink',
              code && 'font-code text-ui',
            )}
          >
            {title}
          </p>
          {sub && (
            <p className="mt-0.5 text-sub leading-[1.45] break-all text-ink-2 @[36rem]/line:truncate">
              {sub}
            </p>
          )}
        </div>
        <div className="col-start-1 row-start-2 min-w-0 @[36rem]/line:col-start-2 @[36rem]/line:row-start-1">
          <StatusSaid status={status} why={why} />
        </div>
        <div className="col-start-2 row-span-2 row-start-1 flex items-center justify-end gap-3 @[36rem]/line:col-start-3 @[36rem]/line:row-span-1">
          {controls}
        </div>
      </div>
    </div>
  )
}

/** A state as plain words, or as a chip when it asks for a hand, with since or until when beside or under it. */
export function StatusSaid({
  status,
  why,
}: {
  status: StatusLine
  why?: string
}) {
  const word =
    status.tone === 'plain' ? (
      <span className="text-ui text-ink">{status.word}</span>
    ) : (
      <Badge variant={CHIP_VARIANT[status.tone]} className="font-bold">
        {status.tone === 'rec' && <ChipDot />}
        {status.word}
      </Badge>
    )

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 @[36rem]/line:block">
      {why ? (
        <InFull says={why} wraps={tipBoxOf(status.tone === 'plain')}>
          {word}
        </InFull>
      ) : (
        word
      )}
      {status.line && (
        <p className="truncate text-sub leading-[1.45] text-ink-2 tabular-nums @[36rem]/line:mt-0.5">
          {status.line}
        </p>
      )}
    </div>
  )
}

export function tunerTitleOf(row: TunerRow): { title: string; code: boolean } {
  return row.name === undefined
    ? { title: row.device, code: true }
    : { title: row.name, code: false }
}

export function tunerSubOf(row: TunerRow): string | undefined {
  const parts = [row.kind && KIND_SAID[row.kind], row.place].filter(
    (part): part is string => Boolean(part),
  )

  return parts.length === 0 ? undefined : parts.join(' · ')
}

export function tunerWhyOf(row: TunerRow): string | undefined {
  if (row.stateSub) {
    return row.stateSub
  }

  if (!row.session) {
    return undefined
  }

  return [
    row.session.saying ?? row.session.label,
    row.session.title,
    row.session.code,
    row.session.endsAt && `終了予定 ${row.session.endsAt}`,
  ]
    .filter((one): one is string => Boolean(one))
    .join('\n')
}

export function CardReaderLine({ row }: { row: CardReaderRow }) {
  return (
    <HardwareLine
      id={row.id}
      title={row.title}
      sub={row.sub}
      status={row.status}
    />
  )
}

const DRIVER_LINK: Record<DriverLink, Pick<StatusLine, 'word' | 'tone'>> = {
  connected: { word: '接続中', tone: 'plain' },
  draining: { word: '終了処理中', tone: 'warn' },
  disconnected: { word: '未接続', tone: 'err' },
  unknown: { word: '接続状態不明', tone: 'warn' },
}

/** The driver itself: which version runs, since when, and whether it answers. */
export function DriverLine({
  facts,
  connection,
}: {
  facts: DriverFacts
  connection: DriverLink
}) {
  return (
    <HardwareLine
      title={`driver ${facts.version ?? EMPTY_VALUE}`}
      sub={facts.startedAt && `${facts.startedAt} から動作`}
      status={{
        ...DRIVER_LINK[connection],
        line: facts.respondedAt && `${facts.respondedAt} に応答`,
      }}
    />
  )
}
