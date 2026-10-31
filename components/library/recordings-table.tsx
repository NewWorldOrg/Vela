'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import type { Recording, RecordingDiscarded } from '@/repository/recordings'
import { DeleteRecordingDialog } from '@/components/recordings/delete-recording-dialog'
import { RecordingRow } from '@/components/library/recording-row'
import { WHEN_LABELS } from '@/lib/when-terms'
import { SelectEvery, TableHead } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronDownIcon } from '@/components/vela/icons'
import { waitsWhile } from '@/components/vela/waiting'

const TABLE_MIN = '60rem'

const HEAD = 'sticky top-0 z-10 h-10 border-0 text-ink-2'

export function RecordingsTable({
  items,
  groups,
  onDelete,
  picking,
  picked,
  onPick,
  waiting = false,
  className,
}: {
  items: Recording[]
  /** The series to head the rows with, in their order; the rows go under no heads where there are none. */
  groups?: { key: string; name: string; items: Recording[] }[]
  onDelete: (id: string) => Promise<RecordingDiscarded>
  picking: boolean
  picked: ReadonlySet<string>
  onPick: (next: ReadonlySet<string>) => void
  waiting?: boolean
  className?: string
}) {
  const router = useRouter()
  const [asked, setAsked] = useState<Recording | null>(null)
  const shown = items.filter((one) => picked.has(one.id)).length
  const wait = waitsWhile(waiting)
  const columns = picking ? 9 : 8

  const rowOf = (r: Recording, nth: number) => (
    <RecordingRow
      key={r.id}
      nth={nth}
      recording={r}
      picking={picking}
      onOpen={() => router.push(`/recordings/${r.id}`)}
      onDelete={() => setAsked(r)}
      selected={picked.has(r.id)}
      onSelect={(taken) => {
        const next = new Set(picked)

        if (taken) {
          next.add(r.id)
        } else {
          next.delete(r.id)
        }

        onPick(next)
      }}
    />
  )

  return (
    <div
      data-slot="table-container"
      inert={wait.inert}
      className={cn('min-w-0 overflow-x-auto', wait.className, className)}
    >
      <table
        role="table"
        className="w-full table-fixed border-separate border-spacing-0"
        style={{ minWidth: TABLE_MIN }}
      >
        <colgroup>
          {picking && <col style={{ width: 'calc(36rem/16)' }} />}
          <col style={{ width: 'calc(118rem/16)' }} />
          <col />
          <col style={{ width: '9.5rem' }} />
          <col style={{ width: '10.5rem' }} />
          <col style={{ width: '5.5rem' }} />
          <col style={{ width: '9rem' }} />
          <col
            className="hidden min-[1366px]:table-column"
            style={{ width: '13rem' }}
          />
          <col style={{ width: 'calc(46rem/16)' }} />
        </colgroup>
        <thead role="rowgroup">
          <tr role="row">
            {picking && (
              <TableHead className={cn(HEAD, 'pl-3')}>
                <SelectEvery>
                  <Checkbox
                    checked={
                      shown === 0
                        ? false
                        : shown === items.length
                          ? true
                          : 'indeterminate'
                    }
                    onCheckedChange={(next) =>
                      onPick(
                        next === true
                          ? new Set(items.map((one) => one.id))
                          : new Set(),
                      )
                    }
                    aria-label="表示中の録画をすべて選ぶ"
                  />
                </SelectEvery>
              </TableHead>
            )}
            <TableHead className={HEAD}>
              <span className="sr-only">絵</span>
            </TableHead>
            <TableHead className={HEAD}>番組</TableHead>
            <TableHead className={HEAD}>チャンネル</TableHead>
            <TableHead aria-sort="descending" className={cn(HEAD, 'text-ink')}>
              <span className="inline-flex items-center gap-1">
                {WHEN_LABELS.recorded}
                <ChevronDownIcon className="size-3" strokeWidth={2} />
              </span>
            </TableHead>
            <TableHead className={HEAD}>長さ</TableHead>
            <TableHead className={HEAD}>視聴</TableHead>
            <TableHead className={cn(HEAD, 'hidden min-[1366px]:table-cell')}>
              状態
            </TableHead>
            <TableHead className={HEAD}>
              <span className="sr-only">操作</span>
            </TableHead>
          </tr>
        </thead>
        {groups ? (
          groups.map((group) => (
            <tbody key={group.key} role="rowgroup">
              <tr role="row">
                <TableHead
                  role="rowheader"
                  colSpan={columns}
                  className="border-0 bg-transparent px-2.5 pt-6 pb-2 text-left text-heading leading-[calc(22rem/16)] font-bold tracking-[-0.015em] text-ink"
                >
                  {group.name}
                  <span className="ml-2 text-sub font-medium tracking-normal text-ink-2">
                    <span className="font-code">{group.items.length}</span> 話
                  </span>
                </TableHead>
              </tr>
              {group.items.map(rowOf)}
            </tbody>
          ))
        ) : (
          <tbody role="rowgroup">{items.map(rowOf)}</tbody>
        )}
      </table>
      <DeleteRecordingDialog
        recording={asked}
        onOpenChange={(open) => !open && setAsked(null)}
        onDelete={onDelete}
      />
    </div>
  )
}
