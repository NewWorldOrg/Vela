'use client'

import { useState } from 'react'

import type { Reservation } from '@/repository/reservations'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Banner } from '@/components/vela/banner'
import { PlusIcon } from '@/components/vela/icons'
import { ReservationRow } from '@/components/reservations/reservation-row'
import { ReservationTabs } from '@/components/reservations/reservation-tabs'

const COLUMNS: { label: string; hidden?: boolean }[] = [
  { label: '競合の詳細の開閉', hidden: true },
  { label: '番組' },
  { label: 'チャンネル' },
  { label: '放送日時' },
  { label: '由来' },
  { label: '状態' },
  { label: '操作', hidden: true },
]

export function ReservationsView({
  reservations,
}: {
  reservations: Reservation[]
}) {
  const [expanded, setExpanded] = useState<string | null>(
    reservations.find((r) => r.state === 'conflict')?.id ?? null,
  )

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-3.5 pt-6 pb-16 min-[701px]:px-5 min-[1061px]:px-[30px]">
      <ReservationTabs
        current="reservations"
        action={
          <Button size="sm" disabled title="予約の追加はこれから実装されます">
            <PlusIcon />
            予約を追加
          </Button>
        }
      />

      <Banner tone="info" className="mb-3.5">
        予約時点でチューナーを確保します。競合はこの画面で解決できます。
      </Banner>

      <Table className="min-w-[900px]" containerClassName="pb-1">
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead key={column.label} className="first:w-8">
                {column.hidden ? (
                  <span className="sr-only">{column.label}</span>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((reservation) => (
            <ReservationRow
              key={reservation.id}
              reservation={reservation}
              expanded={expanded === reservation.id}
              onToggle={() =>
                setExpanded((prev) =>
                  prev === reservation.id ? null : reservation.id,
                )
              }
            />
          ))}
        </TableBody>
      </Table>
    </main>
  )
}
