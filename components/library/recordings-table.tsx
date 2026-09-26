'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import type { Recording, RecordingDiscarded } from '@/repository/recordings'
import { DeleteRecordingDialog } from '@/components/recordings/delete-recording-dialog'
import { OUTCOME_COLUMN } from '@/components/recordings/outcome-chip'
import { RECORDING_QUALITY_COLUMN } from '@/components/recordings/quality-chip'
import { ENCODE_COLUMN } from '@/components/recordings/encode-chip'
import {
  DETAIL_CELL,
  GAP_BEFORE_ACTIONS,
  GAP_BEFORE_STATE,
  RecordingRow,
} from '@/components/library/recording-row'
import { WHEN_LABELS } from '@/lib/when-terms'
import { TableHead } from '@/components/ui/table'
import { useArrived } from '@/hooks/useArrived'

interface Column {
  label: string
  width: string
  hidden?: boolean
  right?: boolean
  detail?: boolean
  gap?: string
}

const STATE_GAP = '0.25rem'

const ACTIONS_GAP = '0.5rem'

const COLUMNS: Column[] = [
  { label: '番組', width: 'calc(320rem/16)' },
  { label: 'チャンネル', width: '11rem' },
  { label: WHEN_LABELS.recorded, width: '8.25rem' },
  { label: '長さ', width: '5.5rem', right: true },
  { label: 'サイズ', width: '7rem', right: true },
  {
    label: '結果',
    width: `calc(${OUTCOME_COLUMN} + ${STATE_GAP})`,
    gap: GAP_BEFORE_STATE,
  },
  {
    label: '品質',
    width: `calc(${RECORDING_QUALITY_COLUMN} + ${STATE_GAP})`,
    gap: GAP_BEFORE_STATE,
  },
  {
    label: 'エンコード',
    width: `calc(${ENCODE_COLUMN} + ${STATE_GAP})`,
    gap: GAP_BEFORE_STATE,
  },
  {
    label: '操作',
    width: `calc(5.5rem + ${ACTIONS_GAP})`,
    hidden: true,
    gap: GAP_BEFORE_ACTIONS,
  },
  { label: '録画詳細へ', width: '3.25rem', hidden: true, detail: true },
]

const TABLE_MIN = '68.75rem'

export function RecordingsTable({
  items,
  onDelete,
}: {
  items: Recording[]
  onDelete: (id: string) => Promise<RecordingDiscarded>
}) {
  const router = useRouter()
  const [asked, setAsked] = useState<Recording | null>(null)

  return (
    <div
      data-slot="table-container"
      tabIndex={0}
      className="min-h-0 flex-initial overflow-auto rounded-xl bg-surface pb-1 outline-none focus-visible:shadow-ring"
    >
      <table
        className="w-full table-fixed border-separate border-spacing-0"
        style={{ minWidth: TABLE_MIN }}
      >
        <colgroup>
          {COLUMNS.map((column) => (
            <col
              key={column.label}
              style={column.width ? { width: column.width } : undefined}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <TableHead
                key={column.label}
                className={cn(
                  'sticky top-0 z-10',
                  column.right && 'text-right',
                  column.gap,
                  column.detail && DETAIL_CELL,
                )}
              >
                {column.hidden ? (
                  <span className="sr-only">{column.label}</span>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
          </tr>
        </thead>
        <tbody {...useArrived()}>
          {items.map((r, nth) => (
            <RecordingRow
              key={r.id}
              nth={nth}
              recording={r}
              onOpen={() => router.push(`/recordings/${r.id}`)}
              onDelete={() => setAsked(r)}
            />
          ))}
        </tbody>
      </table>
      <DeleteRecordingDialog
        recording={asked}
        onOpenChange={(open) => !open && setAsked(null)}
        onDelete={onDelete}
      />
    </div>
  )
}
