'use client'

import { useCallback, useState } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import type { ReservationsResult } from '@/repository/reservations'
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
import { SegmentedControl } from '@/components/vela/segmented-control'
import type { ReservationActions } from '@/components/reservations/reservation-row'
import { ReservationRow } from '@/components/reservations/reservation-row'
import { ReservationTabs } from '@/components/reservations/reservation-tabs'
import { ScreenMain } from '@/components/vela/app-shell'

const COLUMNS: { label: string; hidden?: boolean }[] = [
  { label: '競合の詳細の開閉', hidden: true },
  { label: '番組' },
  { label: 'チャンネル' },
  { label: '放送日時' },
  { label: '由来' },
  { label: '状態' },
  { label: '操作', hidden: true },
]

const CANCELLED_PARAM = 'cancelled'

const BEFORE_THE_END = 'beforeTheEnd'

const EVERY = 'all'

const CANCELLED_OPTIONS = [
  { value: BEFORE_THE_END, label: '放送終了前' },
  { value: EVERY, label: 'すべて' },
]

export function ReservationsView({
  result,
  actions,
}: {
  result: ReservationsResult
  actions: ReservationActions
}) {
  const { items, total, filter } = result
  const [expanded, setExpanded] = useState<string | null>(
    items.find((r) => r.standing === 'conflict')?.id ?? null,
  )
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const onCancelledChange = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString())

      if (next === EVERY) {
        params.set(CANCELLED_PARAM, EVERY)
      } else {
        params.delete(CANCELLED_PARAM)
      }

      const qs = params.toString()

      router.replace((qs ? `${pathname}?${qs}` : pathname) as Route, {
        scroll: false,
      })
    },
    [router, pathname, searchParams],
  )

  return (
    <ScreenMain className="overflow-y-auto px-3.5 pt-6 pb-16 min-[701px]:px-5 min-[1061px]:px-[30px]">
      <ReservationTabs
        current="reservations"
        action={
          <Button size="sm" asChild>
            <Link href="/guide">
              <PlusIcon />
              予約を追加
            </Link>
          </Button>
        }
      />

      <div className="mb-3.5 flex flex-wrap items-center gap-3 rounded-xl bg-surface px-[17px] py-[13px]">
        <span className="text-ui font-medium whitespace-nowrap text-ink-2">
          取消済み
        </span>
        <SegmentedControl
          aria-label="取消済み"
          options={CANCELLED_OPTIONS}
          value={filter.cancelled === EVERY ? EVERY : BEFORE_THE_END}
          onValueChange={onCancelledChange}
        />
        <span className="ml-auto text-sub whitespace-nowrap text-ink-2 max-[900px]:ml-0">
          {items.length === total ? (
            <>
              全 <b className="font-code font-medium text-ink">{total}</b> 件
            </>
          ) : (
            <>
              該当{' '}
              <b className="font-code font-medium text-ink">{items.length}</b>{' '}
              件 / 全 <b className="font-code font-medium text-ink">{total}</b>{' '}
              件
            </>
          )}
        </span>
      </div>

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
          {items.map((reservation) => (
            <ReservationRow
              key={reservation.id}
              reservation={reservation}
              actions={actions}
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
    </ScreenMain>
  )
}
