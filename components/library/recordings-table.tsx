'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import type { Recording, RecordingDiscarded } from '@/repository/recordings'
import { DeleteRecordingDialog } from '@/components/recordings/delete-recording-dialog'
import { RecordingRow } from '@/components/library/recording-row'

const HEADERS: { label: string; hidden?: boolean }[] = [
  { label: '番組' },
  { label: 'チャンネル' },
  { label: '録画日時' },
  { label: '長さ' },
  { label: 'サイズ' },
  { label: '結果' },
  { label: '品質' },
  { label: 'エンコード' },
  { label: '操作', hidden: true },
  { label: '録画詳細へ', hidden: true },
]

export function RecordingsTable({
  items,
  onDelete,
}: {
  items: Recording[]
  onDelete: (id: string) => Promise<RecordingDiscarded>
}) {
  const router = useRouter()
  // One question for the whole table, holding the row it was opened on: a
  // dialog per row would mount as many as the list is long.
  const [asked, setAsked] = useState<Recording | null>(null)

  return (
    <div
      data-slot="table-container"
      // The container scrolls, so it has to be reachable by keyboard.
      tabIndex={0}
      className="-mx-1 min-h-0 flex-1 overflow-auto px-1 pb-1 outline-none focus-visible:shadow-ring"
    >
      {/*
        1208px is what the columns add up to, and the width under which the
        list runs sideways inside its own box rather than taking the page with
        it. At 1296 the list was too wide for every window there is: the
        last column was cut off, and the page itself scrolled sideways to
        reach it. The width came off the columns that were carrying more than
        their content — the title truncates at any width, and the other three
        hold a chip or a figure that never came near their edge.
      */}
      <table className="w-full min-w-[1208px] table-fixed border-separate border-spacing-0">
        <colgroup>
          <col className="w-[252px]" />
          <col className="w-[104px]" />
          <col className="w-[142px]" />
          <col className="w-[86px]" />
          <col className="w-[96px]" />
          <col className="w-[100px]" />
          <col className="w-[140px]" />
          <col className="w-[110px]" />
          <col className="w-[144px]" />
          <col className="w-[34px]" />
        </colgroup>
        <thead>
          <tr>
            {HEADERS.map((header) => (
              <th
                key={header.label}
                className="sticky top-0 z-10 bg-surface-2 px-3.5 py-[9px] text-left text-[10.5px] font-bold tracking-[0.05em] whitespace-nowrap text-ink-3 first:rounded-l-md last:rounded-r-md"
              >
                {header.hidden ? (
                  <span className="sr-only">{header.label}</span>
                ) : (
                  header.label
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
