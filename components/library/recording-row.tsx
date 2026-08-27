'use client'

import Link from 'next/link'

import { cn } from '@/lib/utils'
import { formatBytes, formatLength } from '@/lib/format'
import type { Recording } from '@/repository/recordings'
import { Button } from '@/components/ui/button'
import { ChevronRightIcon, PlayIcon, TrashIcon } from '@/components/vela/icons'
import { EncodeChip } from '@/components/recordings/encode-chip'
import { FileMissingChip } from '@/components/recordings/file-missing-chip'
import { OutcomeChip } from '@/components/recordings/outcome-chip'
import { QualityChip } from '@/components/recordings/quality-chip'
import { RecordingThumb } from '@/components/library/recording-thumb'

const CELL =
  'border-b border-dashed border-line px-3.5 py-3 align-middle text-[13px] group-last:border-b-0 group-hover:border-transparent'

/**
 * A row of the library, which is pressed as a whole to open what it lists.
 *
 * `data-pressable-row` is how the 44px probe knows that. A row carries no role
 * saying it can be pressed — one that did would stop being a row to a screen
 * reader, and the table would stop being a table — so nothing about the markup
 * tells the probe apart from a row that is only read. Rows sit against one
 * another, so the height is what has to reach 44px, and this is what puts that
 * height in front of the probe.
 */
export function RecordingRow({
  recording: r,
  onOpen,
}: {
  recording: Recording
  onOpen: () => void
}) {
  const playable =
    r.outcome !== 'failed' && r.outcome !== 'recording' && !r.fileMissing
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
            <b className="block overflow-hidden text-[13.5px] leading-normal font-bold text-ellipsis whitespace-nowrap [font-feature-settings:'palt']">
              {r.title}
            </b>
            <span className={cn('text-note', subTone)}>
              {r.segments && (
                <span className="mr-1.5 inline-flex items-center rounded-full bg-tint-butter px-[9px] text-[10.5px] font-bold text-ink-2">
                  {r.segments} セグメント
                </span>
              )}
              {r.note}
            </span>
          </span>
        </span>
      </td>
      <td className={cn(CELL, 'text-ui whitespace-nowrap')}>{r.channel}</td>
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
      <td className={CELL}>
        <OutcomeChip recording={r} />
        {r.fileMissing && <FileMissingChip />}
        {r.outcomeDetail && (
          <span className="mt-[3px] block text-[10.5px] leading-relaxed text-ink-3">
            {r.outcomeDetail}
          </span>
        )}
      </td>
      <td className={CELL}>
        <QualityChip recording={r} withDetail subTone={subTone} />
      </td>
      <td className={CELL}>
        <EncodeChip recording={r} subTone={subTone} />
      </td>
      <td className={cn(CELL, 'text-right whitespace-nowrap')}>
        <span
          className="inline-flex gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {playable ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/recordings/${r.id}`}>
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
            variant="outline"
            size="icon-sm"
            aria-label="削除"
            title={
              deletable
                ? '削除はこれから実装されます'
                : '録画中は削除できません'
            }
            disabled
          >
            <TrashIcon />
          </Button>
        </span>
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
