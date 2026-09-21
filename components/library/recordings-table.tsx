'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import type { Recording, RecordingDiscarded } from '@/repository/recordings'
import { DeleteRecordingDialog } from '@/components/recordings/delete-recording-dialog'
import { OUTCOME_PILL_WIDTH } from '@/components/recordings/outcome-chip'
import { RECORDING_QUALITY_PILL_WIDTH } from '@/components/recordings/quality-chip'
import { ENCODE_PILL_WIDTH } from '@/components/recordings/encode-chip'
import { stateColumnPx } from '@/components/recordings/status-cell'
import {
  CELL_SIDES_PX,
  DETAIL_CELL,
  RecordingRow,
} from '@/components/library/recording-row'
import { WHEN_LABELS } from '@/lib/when-terms'

interface Column {
  label: string
  width?: number
  hidden?: boolean
  right?: boolean
  detail?: boolean
}

const COLUMNS: Column[] = [
  { label: '番組' },
  { label: 'チャンネル', width: 148 },
  { label: WHEN_LABELS.recorded, width: 132 },
  { label: '長さ', width: 88, right: true },
  { label: 'サイズ', width: 112, right: true },
  { label: '結果', width: stateColumnPx(OUTCOME_PILL_WIDTH, CELL_SIDES_PX) },
  {
    label: '品質',
    width: stateColumnPx(RECORDING_QUALITY_PILL_WIDTH, CELL_SIDES_PX),
  },
  {
    label: 'エンコード',
    width: stateColumnPx(ENCODE_PILL_WIDTH, CELL_SIDES_PX),
  },
  { label: '操作', width: 178, hidden: true },
  { label: '録画詳細へ', width: 28, hidden: true, detail: true },
]

const PROGRAMME_MIN_PX = 300

const TABLE_MIN_PX =
  COLUMNS.reduce((sum, column) => sum + (column.width ?? 0), 0) +
  PROGRAMME_MIN_PX

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
      className="-mx-1 min-h-0 flex-1 overflow-auto px-1 pb-1 outline-none focus-visible:shadow-ring"
    >
      <table
        className="w-full table-fixed border-separate border-spacing-0"
        style={{ minWidth: TABLE_MIN_PX }}
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
              <th
                key={column.label}
                className={cn(
                  'sticky top-0 z-10 bg-surface-2 px-3 py-[9px] text-left text-[10.5px] font-bold tracking-[0.05em] whitespace-nowrap text-ink-3 first:rounded-l-md last:rounded-r-md',
                  column.right && 'text-right',
                  column.detail && DETAIL_CELL,
                )}
              >
                {column.hidden ? (
                  <span className="sr-only">{column.label}</span>
                ) : (
                  column.label
                )}
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
