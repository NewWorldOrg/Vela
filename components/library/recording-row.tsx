'use client'

import { EMPTY_VALUE } from '@/lib/empty-value'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { delayOf, rowDelayMs } from '@/lib/arrival'
import { formatBytes, formatLength } from '@/lib/format'
import { playsInBrowser, unfinishedDeletionShapeOf } from '@/lib/recordings'
import type { Recording } from '@/repository/recordings'
import { Button } from '@/components/ui/button'
import { ChevronRightIcon, PlayIcon, TrashIcon } from '@/components/vela/icons'
import { EncodeChip } from '@/components/recordings/encode-chip'
import { OutcomeChip } from '@/components/recordings/outcome-chip'
import { QualityChip } from '@/components/recordings/quality-chip'
import { StatusCell } from '@/components/recordings/status-cell'
import { ActionRow } from '@/components/vela/action-row'
import { ChannelMark } from '@/components/vela/channel-mark'
import { InFull } from '@/components/vela/in-full'
import { RecordingThumb } from '@/components/library/recording-thumb'

export const DETAIL_CELL = 'px-1.5'

const CELL =
  'border-b border-dashed border-line px-3 py-3 align-middle text-[13px] group-last:border-b-0 group-hover:border-transparent'

const NUMBER = 'font-code text-ui whitespace-nowrap text-right'

const FILE_MISSING = 'ファイル不在'

const NO_FILE_ON_DISK = '実ファイルなし'

function leftOver(r: Recording) {
  return unfinishedDeletionShapeOf(r)
}

function Dash() {
  return <span className="font-sans text-ink-3">{EMPTY_VALUE}</span>
}

function Length({ recording: r }: { recording: Recording }) {
  if (r.outcome === 'recording') {
    return <>進行中</>
  }

  if (r.lengthSec == null) {
    return <Dash />
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

function Size({ recording: r }: { recording: Recording }) {
  const said = r.fileMissing ? (
    <span className="font-sans text-ink-3">{NO_FILE_ON_DISK}</span>
  ) : r.sizeBytes == null ? (
    <Dash />
  ) : (
    <>{formatBytes(r.sizeBytes)}</>
  )

  if (!r.sizeObservedAt) {
    return said
  }

  return (
    <InFull says={r.sizeObservedAt}>
      <span>{said}</span>
    </InFull>
  )
}

export function RecordingRow({
  recording: r,
  nth,
  onOpen,
  onDelete,
}: {
  recording: Recording
  nth: number
  onOpen: () => void
  onDelete: () => void
}) {
  const playable = playsInBrowser(r)
  const deletable = r.outcome !== 'recording'
  const subTone = r.outcome === 'recording' ? 'text-ink-2' : 'text-ink-3'

  return (
    <tr
      data-pressable-row
      onClick={onOpen}
      style={delayOf(rowDelayMs(nth))}
      className={cn(
        'arrives group cursor-pointer transition-[translate,box-shadow,background-color] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px hover:bg-surface hover:shadow-pop active:translate-x-px active:translate-y-px active:shadow-pop-none',
        r.outcome === 'recording' && 'bg-brand-soft',
      )}
    >
      <td className={cn(CELL, 'group-hover:rounded-l-md')}>
        <span className="flex min-w-0 items-center gap-3">
          <RecordingThumb recording={r} subTone={subTone} />
          <span className="min-w-0">
            <InFull says={r.title}>
              <b className="line-clamp-2 text-[13.5px] leading-[1.4] font-bold [font-feature-settings:'palt']">
                {r.title}
              </b>
            </InFull>
            <span className={cn('block truncate text-note', subTone)}>
              {r.segments && (
                <span className="mr-1.5 inline-flex items-center rounded-full bg-tint-butter px-[9px] text-[10.5px] font-bold text-ink-2">
                  {r.segments} セグメント
                </span>
              )}
              {r.note && (
                <InFull says={r.note}>
                  <span>{r.note}</span>
                </InFull>
              )}
            </span>
          </span>
        </span>
      </td>
      <td className={cn(CELL, 'text-ui')}>
        <span className="flex items-center gap-2">
          <ChannelMark logo={r.channelLogo} no={r.channelNo} keepsTheSlot />
          <span className="min-w-0 leading-[1.4]">{r.channel}</span>
        </span>
      </td>
      <td
        className={cn(CELL, 'font-code text-ui whitespace-nowrap text-ink-2')}
      >
        {r.recordedAtLabel}
      </td>
      <td className={cn(CELL, NUMBER)}>
        <Length recording={r} />
      </td>
      <td className={cn(CELL, NUMBER)}>
        <Size recording={r} />
      </td>
      <td className={CELL}>
        <StatusCell>
          <OutcomeChip
            recording={r}
            say
            also={[
              r.outcomeDetail,
              r.fileMissing && FILE_MISSING,
              leftOver(r)?.label,
              leftOver(r)?.detail,
            ]}
          />
        </StatusCell>
      </td>
      <td className={CELL}>
        <StatusCell>
          <QualityChip recording={r} say also={[r.quality.detail]} />
        </StatusCell>
      </td>
      <td className={CELL}>
        <StatusCell>
          <EncodeChip recording={r} say />
        </StatusCell>
      </td>
      <td className={cn(CELL, 'text-right whitespace-nowrap')}>
        <ActionRow className="gap-1.5" onClick={(e) => e.stopPropagation()}>
          {playable ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/recordings/${r.id}?at=0`}>
                <PlayIcon />
                再生
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <PlayIcon />
              再生
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            title={deletable ? undefined : '録画中は削除できません'}
            disabled={!deletable}
            onClick={onDelete}
          >
            <TrashIcon />
            削除
          </Button>
        </ActionRow>
      </td>
      <td
        className={cn(
          CELL,
          DETAIL_CELL,
          'text-right text-ink-3 group-hover:rounded-r-md group-hover:text-brand',
        )}
      >
        <ChevronRightIcon className="size-[15px]" />
      </td>
    </tr>
  )
}
