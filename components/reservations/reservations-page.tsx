'use client'

import { useCallback, useState } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import type {
  EpgDriftKind,
  ReservationsResult,
} from '@/repository/reservations'
import {
  RESERVATION_EPG_DIVERGED_TERM,
  RESERVATION_EPG_MISSING_TERM,
} from '@/lib/state-terms'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableColumns,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/vela/empty-state'
import { PlusIcon, ReservationIcon } from '@/components/vela/icons'
import { SegmentedControl } from '@/components/vela/segmented-control'
import type { ReservationActions } from '@/components/reservations/reservation-row'
import { ReservationRow } from '@/components/reservations/reservation-row'
import type { ReservationBulkActions } from '@/components/reservations/reservation-selection'
import { ReservationSelection } from '@/components/reservations/reservation-selection'
import { ReservationTabs } from '@/components/reservations/reservation-tabs'
import { unfoldShows, useUnfolding } from '@/components/vela/unfold'
import { ScreenMain } from '@/components/vela/app-shell'
import { cn } from '@/lib/utils'
import { RESERVATION_STATE_COLUMN } from '@/components/reservations/reservation-state-chip'
import { WHEN_LABELS } from '@/lib/when-terms'
import { useArrived } from '@/hooks/useArrived'

/*
 * 番組 and 由来 share the room left over. 操作 holds up to four small buttons
 * (`この予約の録画` `復元` `編集` `取り消す`), which is why it is the widest of
 * the fixed ones.
 */
const COLUMNS: {
  label: string
  width: string
  hidden?: boolean
  narrow?: boolean
}[] = [
  {
    label: '競合の詳細の開閉',
    width: 'calc(34rem/16)',
    hidden: true,
    narrow: true,
  },
  { label: '番組', width: 'calc(300rem/16)' },
  { label: 'チャンネル', width: 'calc(168rem/16)' },
  { label: WHEN_LABELS.broadcast, width: 'calc(210rem/16)' },
  { label: '由来', width: 'calc(180rem/16)' },
  { label: '状態', width: RESERVATION_STATE_COLUMN },
  { label: '操作', width: 'calc(360rem/16)', hidden: true },
]

const SHOW_PARAM = 'show'

const EPG_PARAM = 'epg'

const UNSETTLED = 'unsettled'

const EVERY = 'all'

const SHOW_OPTIONS = [
  { value: UNSETTLED, label: '未完了' },
  { value: EVERY, label: 'すべて' },
]

function DriftButton({
  label,
  count,
  pressed,
  onClick,
}: {
  label: string
  count: number
  pressed: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={pressed}
      onClick={onClick}
      className={
        pressed ? 'border-brand bg-brand-soft font-bold text-brand' : undefined
      }
    >
      {label} <b className="font-code font-medium tabular-nums">{count}</b> 件
    </Button>
  )
}

export function ReservationsView({
  result,
  actions,
  bulk,
}: {
  result: ReservationsResult
  actions: ReservationActions
  bulk: ReservationBulkActions
}) {
  const { items, total, drift, filter } = result
  const unfolded = useUnfolding()
  const firstConflict = items.find((one) => one.standing === 'conflict')?.id
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  const arrived = useArrived()
  const chosen = items.filter((one) => picked.has(one.id))
  const clear = useCallback(() => setPicked(new Set()), [])
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const go = useCallback(
    (taken: [string, string | undefined][]) => {
      const params = new URLSearchParams(searchParams.toString())

      for (const [key, value] of taken) {
        if (value === undefined) {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }

      const qs = params.toString()

      router.replace((qs ? `${pathname}?${qs}` : pathname) as Route, {
        scroll: false,
      })
    },
    [router, pathname, searchParams],
  )
  const onShowChange = useCallback(
    (next: string) => {
      go([[SHOW_PARAM, next === EVERY ? EVERY : undefined]])
    },
    [go],
  )
  const onDriftPick = useCallback(
    (kind: EpgDriftKind) => {
      go([[EPG_PARAM, filter.epg === kind ? undefined : kind]])
    },
    [go, filter.epg],
  )
  const onClearFilters = useCallback(() => {
    go([
      [SHOW_PARAM, EVERY],
      [EPG_PARAM, undefined],
    ])
  }, [go])

  return (
    <ScreenMain
      scroll="within"
      className="flex flex-col px-3.5 pt-6 pb-6 min-[701px]:px-5 min-[1061px]:px-[calc(30rem/16)]"
    >
      <h1 className="heading mb-3.5 flex items-center gap-2 text-[calc(20rem/16)]">
        <ReservationIcon className="size-[calc(18rem/16)] text-brand" />
        予約
      </h1>
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

      <div className="mb-3.5 flex flex-wrap items-center gap-3 rounded-xl bg-surface px-[calc(17rem/16)] py-[calc(13rem/16)]">
        <span className="text-ui font-medium whitespace-nowrap text-ink-2">
          表示
        </span>
        <SegmentedControl
          aria-label="表示"
          options={SHOW_OPTIONS}
          value={filter.show === EVERY ? EVERY : UNSETTLED}
          onValueChange={onShowChange}
        />
        {drift.diverged > 0 && (
          <DriftButton
            label={RESERVATION_EPG_DIVERGED_TERM.label}
            count={drift.diverged}
            pressed={filter.epg === 'diverged'}
            onClick={() => onDriftPick('diverged')}
          />
        )}
        {drift.missing > 0 && (
          <DriftButton
            label={RESERVATION_EPG_MISSING_TERM.label}
            count={drift.missing}
            pressed={filter.epg === 'missing'}
            onClick={() => onDriftPick('missing')}
          />
        )}

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

      {items.length === 0 ? (
        <EmptyState
          spot={total === 0 ? 'antenna' : 'star'}
          title={total === 0 ? '予約はありません' : '未完了の予約はありません'}
          titleLevel={2}
          className="mt-10 max-w-[calc(560rem/16)]"
          action={
            total === 0 ? undefined : (
              <Button variant="halt" size="sm" onClick={onClearFilters}>
                条件を消す
              </Button>
            )
          }
        />
      ) : (
        <Table
          className="table-fixed min-w-[calc(960rem/16)]"
          containerClassName="min-h-0 flex-1 overflow-y-auto pb-1"
        >
          <TableColumns
            widths={[
              'calc(44rem/16)',
              ...COLUMNS.map((column) => column.width),
            ]}
          />
          <TableHeader className="[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10 [&>tr>th]:py-[calc(13rem/16)]">
            <TableRow>
              <TableHead className="w-11">
                <Checkbox
                  checked={
                    chosen.length === 0
                      ? false
                      : chosen.length === items.length
                        ? true
                        : 'indeterminate'
                  }
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
                <TableHead key={column.label}>
                  {column.hidden ? (
                    <span className="sr-only">{column.label}</span>
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody {...arrived}>
            {items.map((reservation, nth) => (
              <ReservationRow
                key={reservation.id}
                nth={nth}
                reservation={reservation}
                actions={actions}
                expanded={
                  unfolded.open === reservation.id ||
                  (unfolded.open === undefined &&
                    unfolded.folding === undefined &&
                    firstConflict === reservation.id)
                }
                shown={
                  unfoldShows(unfolded, reservation.id) ||
                  (unfolded.open === undefined &&
                    unfolded.folding === undefined &&
                    firstConflict === reservation.id)
                }
                onToggle={() => unfolded.toggle(reservation.id)}
                onSettle={() => unfolded.settle(reservation.id)}
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
      )}
    </ScreenMain>
  )
}
