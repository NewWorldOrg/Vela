'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import type { Recording } from '@/repository/recordings'
import { DeleteRecordingDialog } from '@/feature/recordings/delete-recording-dialog'
import { RecordingRow } from '@/page-component/library/recording-row'

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
