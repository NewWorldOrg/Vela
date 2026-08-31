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
            {HEADERS.map((header) => (
              <th
                key={header.label}
                className="bg-surface-2 px-3.5 py-[9px] text-left text-[10.5px] font-bold tracking-[0.05em] whitespace-nowrap text-ink-3 first:rounded-l-md last:rounded-r-md"
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
