'use client'

import { useCallback, useState } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import type { ReservationsResult } from '@/repository/reservations'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PlusIcon } from '@/components/vela/icons'
import { SegmentedControl } from '@/components/vela/segmented-control'
import type { ReservationActions } from '@/components/reservations/reservation-row'
import { ReservationRow } from '@/components/reservations/reservation-row'
import type { ReservationBulkActions } from '@/components/reservations/reservation-selection'
import { ReservationSelection } from '@/components/reservations/reservation-selection'
import { ReservationTabs } from '@/components/reservations/reservation-tabs'
import { ScreenMain } from '@/components/vela/app-shell'

const COLUMNS: { label: string; hidden?: boolean; narrow?: boolean }[] = [
  { label: '競合の詳細の開閉', hidden: true, narrow: true },
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
  bulk,
}: {
  result: ReservationsResult
  actions: ReservationActions
  bulk: ReservationBulkActions
}) {
  const { items, total, filter } = result
  const [expanded, setExpanded] = useState<string | null>(
    items.find((r) => r.standing === 'conflict')?.id ?? null,
  )
  // Read against the list as it stands, so a row that has since gone leaves the
  // selection with it rather than being asked about again.
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  const chosen = items.filter((one) => picked.has(one.id))
  const clear = useCallback(() => setPicked(new Set()), [])
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
    <ScreenMain
      scroll="within"
      className="flex flex-col px-3.5 pt-6 pb-6 min-[701px]:px-5 min-[1061px]:px-[30px]"
    >
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

      {chosen.length > 0 && (
        <ReservationSelection chosen={chosen} onClear={clear} actions={bulk} />
      )}

      <Table
        className="min-w-[960px]"
        containerClassName="min-h-0 flex-1 overflow-y-auto pb-1"
      >
        <TableHeader className="[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10">
          <TableRow>
            <TableHead className="w-8">
              <Checkbox
                checked={
                  chosen.length === 0
                    ? false
                    : chosen.length === items.length
                      ? true
                      : 'indeterminate'
                }
                disabled={items.length === 0}
                onCheckedChange={(next) =>
                  setPicked(
                    next === true
                      ? new Set(items.map((one) => one.id))
                      : new Set(),
                  )
                }
                aria-label="表示中の予約をすべて選ぶ"
              />
            </TableHead>
            {COLUMNS.map((column) => (
              <TableHead
                key={column.label}
                className={column.narrow ? 'w-8' : undefined}
              >
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
              selected={picked.has(reservation.id)}
              onSelect={(taken) =>
                setPicked((prev) => {
                  const next = new Set(prev)

                  if (taken) {
                    next.add(reservation.id)
                  } else {
                    next.delete(reservation.id)
                  }

                  return next
                })
              }
            />
          ))}
        </TableBody>
      </Table>
    </ScreenMain>
  )
}
