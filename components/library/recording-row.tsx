'use client'

import Link from 'next/link'

import { cn } from '@/lib/utils'
import { delayOf, rowArrivesIn, rowDelayMs } from '@/lib/arrival'
import { formatLength } from '@/lib/format'
import { watchedShareOf, watchStateOf } from '@/lib/library-days'
import { seriesNameOf } from '@/lib/library-series'
import type { Recording } from '@/repository/recordings'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreIcon, TrashIcon } from '@/components/vela/icons'
import { InFull } from '@/components/vela/in-full'
import { EMPTY_VALUE } from '@/lib/empty-value'
import { RecordingThumb } from '@/components/library/recording-thumb'
import { AttentionChips } from '@/components/library/attention-chips'

/** A cell of the library's table: a hairline under it from the title on, gone under a row a pointer rests on and the row above it. */
export const CELL =
  'h-[calc(70rem/16)] border-b border-hair px-[calc(13rem/16)] align-middle text-ui transition-[background-color,border-color] duration-[140ms] ease-toy group-last:border-b-0 group-hover:border-transparent group-hover:bg-surface [tr:has(+tr:hover)>&]:border-transparent'

function Length({ recording: r }: { recording: Recording }) {
  if (r.outcome === 'recording') {
    return <>進行中</>
  }

  if (r.lengthSec == null) {
    return <span className="text-ink-2">{EMPTY_VALUE}</span>
  }

  const said = formatLength(r.lengthSec)

  if (!r.expectedLengthSec) {
    return <>{said}</>
  }

  return (
    <InFull says={`予定 ${formatLength(r.expectedLengthSec)}`}>
      <span>{said}</span>
    </InFull>
  )
}

/** How far a recording was watched: 未視聴 in the ink, the line and its share part-way, 視聴済み quietly. */
function Watched({ recording }: { recording: Recording }) {
  const state = watchStateOf(recording)

  if (state === 'unwatched') {
    return <b className="text-note font-semibold text-ink">未視聴</b>
  }

  if (state === 'watched') {
    return <span className="text-note text-ink-2">視聴済み</span>
  }

  const share = Math.round((watchedShareOf(recording) ?? 0) * 100)

  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="h-[3px] w-11 overflow-hidden rounded-full bg-surface-2"
      >
        <span
          className="block h-full rounded-full bg-ink"
          style={{ width: `${share}%` }}
        />
      </span>
      <span className="font-code text-note text-ink-2">{share}%</span>
    </span>
  )
}

export function RecordingRow({
  recording: r,
  nth,
  picking,
  selected,
  onSelect,
  onOpen,
  onDelete,
}: {
  recording: Recording
  nth: number
  picking: boolean
  selected: boolean
  onSelect: (chosen: boolean) => void
  onOpen: () => void
  onDelete: () => void
}) {
  const deletable = r.outcome !== 'recording'
  const state = watchStateOf(r)
  const series = seriesNameOf(r.title)
  const under = series !== r.title.normalize('NFKC').trim() ? series : r.genre

  return (
    <tr
      role="row"
      data-pressable-row
      data-recording={r.id}
      data-state={selected ? 'selected' : undefined}
      onClick={picking ? () => onSelect(!selected) : onOpen}
      style={delayOf(rowDelayMs(nth))}
      className={cn(rowArrivesIn(nth), 'group cursor-pointer')}
    >
      {picking && (
        <td
          role="cell"
          className={cn(CELL, 'rounded-l-md border-transparent pr-0 pl-3')}
          onClick={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={(next) => onSelect(next === true)}
            aria-label={`${r.title} を選ぶ`}
          />
        </td>
      )}
      <td
        role="cell"
        className={cn(
          CELL,
          'border-transparent pr-1 pl-2.5',
          !picking && 'rounded-l-md',
        )}
      >
        <RecordingThumb recording={r} />
      </td>
      <td role="cell" className={CELL}>
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="min-w-0">
            <Link
              href={`/recordings/${r.id}`}
              onClick={(event) => event.stopPropagation()}
              tabIndex={picking ? -1 : undefined}
              className={cn(
                'tap-target flex min-w-0 items-center gap-1.5 text-[calc(14.5rem/16)] leading-5 font-semibold tracking-[-0.008em] no-underline outline-none focus-visible:shadow-ring',
                state === 'watched' ? 'text-ink-2' : 'text-ink',
              )}
            >
              {state === 'unwatched' && (
                <span
                  data-slot="unwatched-dot"
                  className="size-1.5 shrink-0 rounded-full bg-accent"
                >
                  <span className="sr-only">未視聴</span>
                </span>
              )}
              <InFull says={r.title}>
                <span className="truncate">{r.title}</span>
              </InFull>
            </Link>
            {under && (
              <span className="mt-0.5 block truncate text-sub text-ink-2">
                {under}
              </span>
            )}
          </span>
          <AttentionChips
            recording={r}
            className="shrink-0 flex-nowrap min-[1366px]:hidden"
          />
        </span>
      </td>
      <td role="cell" className={cn(CELL, 'truncate')}>
        {r.channel}
      </td>
      <td
        role="cell"
        className={cn(CELL, 'font-code whitespace-nowrap text-ink-2')}
      >
        {r.recordedAtLabel}
      </td>
      <td role="cell" className={cn(CELL, 'font-code whitespace-nowrap')}>
        <Length recording={r} />
      </td>
      <td role="cell" className={CELL}>
        <Watched recording={r} />
      </td>
      <td role="cell" className={cn(CELL, 'hidden min-[1366px]:table-cell')}>
        <AttentionChips recording={r} />
      </td>
      <td
        role="cell"
        className={cn(CELL, 'rounded-r-md pr-2 pl-0 text-right')}
        onClick={(event) => event.stopPropagation()}
      >
        {!picking && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="この録画の操作"
              className="tap-target inline-grid size-9 cursor-pointer place-items-center rounded-full text-ink-2 outline-none transition-[background-color,color,opacity] duration-[140ms] ease-toy hover:bg-surface-2 hover:text-ink focus-visible:shadow-ring data-[state=open]:bg-surface-2 data-[state=open]:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:focus-visible:opacity-100"
            >
              <MoreIcon className="size-[calc(18rem/16)]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                disabled={!deletable}
                title={deletable ? undefined : '録画中のため、削除できません。'}
                onSelect={onDelete}
              >
                <TrashIcon />
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </td>
    </tr>
  )
}
