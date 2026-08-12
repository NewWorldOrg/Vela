'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import { formatBytes, formatLength } from '@/lib/format'
import type { Recording } from '@/repository/recordings'
import { Button } from '@/components/ui/button'
import {
  ChevronRightIcon,
  PlayIcon,
  ThumbErrorIcon,
  ThumbMissingIcon,
  ThumbPendingIcon,
  ThumbShotIcon,
  TrashIcon,
} from '@/components/vela/icons'
import {
  EncodeChip,
  FileMissingChip,
  OutcomeChip,
  QualityChip,
} from '@/page-component/recordings/chips'
import { DeleteRecordingDialog } from '@/page-component/recordings/delete-recording-dialog'

const HEADERS = [
  '番組',
  'チャンネル',
  '録画日時',
  '長さ',
  'サイズ',
  '結果',
  '品質',
  'エンコード',
  '',
  '',
]

export function RecordingsTable({ items }: { items: Recording[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<Recording | null>(null)

  return (
    <>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <table className="w-full min-w-[1296px] table-fixed border-separate border-spacing-0">
          <colgroup>
            <col className="w-[296px]" />
            <col className="w-[104px]" />
            <col className="w-[142px]" />
            <col className="w-[86px]" />
            <col className="w-[110px]" />
            <col className="w-[112px]" />
            <col className="w-[158px]" />
            <col className="w-[110px]" />
            <col className="w-[144px]" />
            <col className="w-[34px]" />
          </colgroup>
          <thead>
            <tr>
              {HEADERS.map((h, i) => (
                <th
                  key={i}
                  className="bg-surface-2 px-3.5 py-[9px] text-left text-[10.5px] font-bold tracking-[0.05em] whitespace-nowrap text-ink-3 first:rounded-l-md last:rounded-r-md"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <RecordingRow
                key={r.id}
                recording={r}
                onOpen={() => router.push(`/recordings/${r.id}`)}
                onDelete={() => setDeleting(r)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <DeleteRecordingDialog
        recording={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </>
  )
}

function RecordingRow({
  recording: r,
  onOpen,
  onDelete,
}: {
  recording: Recording
  onOpen: () => void
  onDelete: () => void
}) {
  const playable =
    r.outcome !== 'failed' && r.outcome !== 'recording' && !r.fileMissing
  const deletable = r.outcome !== 'recording'
  const subTone = r.outcome === 'recording' ? 'text-ink-2' : 'text-ink-3'

  return (
    <tr
      onClick={onOpen}
      className={cn(
        'group cursor-pointer transition-[translate,box-shadow,background-color] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px hover:bg-surface hover:shadow-pop active:translate-x-px active:translate-y-px active:shadow-pop-none',
        r.outcome === 'recording' && 'bg-brand-soft',
      )}
    >
      <Td className="group-hover:rounded-l-md">
        <span className="flex min-w-0 items-center gap-3">
          <Thumb recording={r} subTone={subTone} />
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
      </Td>
      <Td className="text-ui whitespace-nowrap">{r.channel}</Td>
      <Td className="font-code text-ui whitespace-nowrap text-ink-2">
        {r.recordedAtLabel}
        {r.recordedAtNote && (
          <small className={cn('block font-sans text-[10.5px]', subTone)}>
            {r.recordedAtNote}
          </small>
        )}
      </Td>
      <Td className="font-code text-ui whitespace-nowrap">
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
      </Td>
      <Td className="font-code text-ui whitespace-nowrap">
        {formatBytes(r.sizeBytes)}
        <small className={cn('block font-sans text-[10.5px]', subTone)}>
          {r.fileMissing ? '実ファイルなし' : r.sizeObservedAt}
        </small>
      </Td>
      <Td>
        <OutcomeChip recording={r} />
        {r.fileMissing && <FileMissingChip />}
        {r.outcomeDetail && (
          <span className="mt-[3px] block text-[10.5px] leading-relaxed text-ink-3">
            {r.outcomeDetail}
          </span>
        )}
      </Td>
      <Td>
        <QualityChip recording={r} withDetail subTone={subTone} />
      </Td>
      <Td>
        <EncodeChip recording={r} subTone={subTone} />
      </Td>
      <Td className="text-right whitespace-nowrap">
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
            title={deletable ? '削除' : '録画中は削除できません'}
            disabled={!deletable}
            onClick={onDelete}
          >
            <TrashIcon />
          </Button>
        </span>
      </Td>
      <Td className="text-right text-ink-3 group-hover:rounded-r-md group-hover:text-brand">
        <ChevronRightIcon className="size-[15px]" />
      </Td>
    </tr>
  )
}

function Td({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      className={cn(
        'border-b border-dashed border-line px-3.5 py-3 align-middle text-[13px] group-last:border-b-0 group-hover:border-transparent',
        className,
      )}
      {...props}
    />
  )
}

function Thumb({
  recording: r,
  subTone = 'text-ink-3',
}: {
  recording: Recording
  subTone?: string
}) {
  const base =
    'flex h-[52px] w-[92px] shrink-0 flex-col items-center justify-center gap-px overflow-hidden rounded-md border'
  const art = {
    shot: <ThumbShotIcon className="size-[19px] text-sky" />,
    pending: <ThumbPendingIcon className="size-[19px] text-ink-3" />,
    none: <ThumbMissingIcon className="size-[19px] text-ink-3" />,
    error: <ThumbErrorIcon className="size-[19px] text-coral" />,
  }[r.thumbnail]

  return (
    <span
      className={cn(
        base,
        r.thumbnail === 'shot' && 'border-line bg-tint-sky',
        r.thumbnail === 'pending' && 'border-dashed border-line bg-surface-2',
        r.thumbnail === 'none' &&
          'border-dashed border-line-strong bg-transparent',
        r.thumbnail === 'error' && 'border-coral-line bg-coral-soft',
      )}
    >
      {art}
      {r.thumbnailLabel && (
        <span
          className={cn(
            'text-center text-[9px] leading-tight',
            r.thumbnail === 'error' ? 'text-coral' : subTone,
          )}
        >
          {r.thumbnailLabel}
        </span>
      )}
    </span>
  )
}
