'use client'

import Link from 'next/link'

import { cn } from '@/lib/utils'
import { formatBytes, formatLength } from '@/lib/format'
import { playsInBrowser } from '@/lib/recordings'
import type { Recording } from '@/repository/recordings'
import { Button } from '@/components/ui/button'
import { ChevronRightIcon, PlayIcon, TrashIcon } from '@/components/vela/icons'
import { EncodeChip } from '@/components/recordings/encode-chip'
import { FileMissingChip } from '@/components/recordings/file-missing-chip'
import { OutcomeChip } from '@/components/recordings/outcome-chip'
import { QualityChip } from '@/components/recordings/quality-chip'
import { COLUMN_WIDE, StatusCell } from '@/components/recordings/status-cell'
import { UnfinishedDeletionChip } from '@/components/recordings/unfinished-deletion-chip'
import { ActionRow } from '@/components/vela/action-row'
import { ChannelMark } from '@/components/vela/channel-mark'
import { InFull } from '@/components/vela/in-full'
import { RecordingThumb } from '@/components/library/recording-thumb'

const CELL =
  'border-b border-dashed border-line px-3.5 py-3 align-middle text-[13px] group-last:border-b-0 group-hover:border-transparent'

export function RecordingRow({
  recording: r,
  onOpen,
  onDelete,
}: {
  recording: Recording
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
      className={cn(
        'group cursor-pointer transition-[translate,box-shadow,background-color] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px hover:bg-surface hover:shadow-pop active:translate-x-px active:translate-y-px active:shadow-pop-none',
        r.outcome === 'recording' && 'bg-brand-soft',
      )}
    >
      <td className={cn(CELL, 'group-hover:rounded-l-md')}>
        <span className="flex min-w-0 items-center gap-3">
          <RecordingThumb recording={r} subTone={subTone} />
          <span className="min-w-0">
            <InFull says={r.title}>
              <b className="block overflow-hidden text-[13.5px] leading-normal font-bold text-ellipsis whitespace-nowrap [font-feature-settings:'palt']">
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
          <span className="min-w-0">{r.channel}</span>
        </span>
      </td>
      <td
        className={cn(CELL, 'font-code text-ui whitespace-nowrap text-ink-2')}
      >
        {r.recordedAtLabel}
        {r.recordedAtNote && (
          <small className={cn('block font-sans text-[10.5px]', subTone)}>
            {r.recordedAtNote}
          </small>
        )}
      </td>
      <td className={cn(CELL, 'font-code text-ui whitespace-nowrap')}>
        {r.outcome === 'recording' ? (
          '進行中'
        ) : r.lengthSec == null ? (
          <span className="text-ink-3">—</span>
        ) : (
          <>
            {formatLength(r.lengthSec)}
            {r.expectedLengthSec && (
              <span className="text-ink-3">
                {' '}
                / {formatLength(r.expectedLengthSec)}
              </span>
            )}
          </>
        )}
      </td>
      <td className={cn(CELL, 'font-code text-ui whitespace-nowrap')}>
        {r.sizeBytes == null ? (
          <span className="text-ink-3">—</span>
        ) : (
          formatBytes(r.sizeBytes)
        )}
        <small className={cn('block font-sans text-[10.5px]', subTone)}>
          {r.fileMissing ? '実ファイルなし' : r.sizeObservedAt}
        </small>
      </td>
      <td className={cn(CELL, 'align-top')}>
        <StatusCell note={r.outcomeDetail} noteTone={subTone}>
          <OutcomeChip recording={r} width={COLUMN_WIDE} />
          {r.fileMissing && <FileMissingChip width={COLUMN_WIDE} />}
          <UnfinishedDeletionChip recording={r} width={COLUMN_WIDE} />
        </StatusCell>
      </td>
      <td className={cn(CELL, 'align-top')}>
        <StatusCell
          note={r.quality.detail}
          noteTone={subTone}
          noteClassName={r.quality.measured ? 'font-code' : undefined}
        >
          <QualityChip recording={r} width={COLUMN_WIDE} />
        </StatusCell>
      </td>
      <td className={cn(CELL, 'align-top')}>
        <StatusCell>
          <EncodeChip recording={r} width={COLUMN_WIDE} />
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
          'text-right text-ink-3 group-hover:rounded-r-md group-hover:text-brand',
        )}
      >
        <ChevronRightIcon className="size-[15px]" />
      </td>
    </tr>
  )
}
