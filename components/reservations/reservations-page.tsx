'use client'

import { useCallback, useState, useTransition } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { addressWith } from '@/lib/path'
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
  SelectEvery,
  Table,
  TableBody,
  TableColumns,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cardPlace } from '@/components/ui/table-cards'
import { EmptyState } from '@/components/vela/empty-state'
import { PlusIcon, ReservationIcon } from '@/components/vela/icons'
import { SegmentedControl } from '@/components/vela/segmented-control'
import type { ReservationActions } from '@/components/reservations/reservation-row'
import { ReservationRow } from '@/components/reservations/reservation-row'
import { RelayRow } from '@/components/reservations/relay-row'
import type { Reservation } from '@/repository/reservations'
import { linesOf } from '@/lib/reservations'
import type { ReservationBulkActions } from '@/components/reservations/reservation-selection'
import { ReservationSelection } from '@/components/reservations/reservation-selection'
import { ReservationTabs } from '@/components/reservations/reservation-tabs'
import { unfoldShows, useUnfolding } from '@/components/vela/unfold'
import { ScreenMain } from '@/components/vela/app-shell'
import { PhoneBarLink, PhoneBarTools } from '@/components/vela/phone-bar-tools'
import { OnAnUprightPhone } from '@/components/vela/on-an-upright-phone'
import {
  PhoneConflict,
  PhoneReservationRows,
  ReservationBeside,
} from '@/components/reservations/phone-reservations'
import { SidewaysPanes } from '@/components/vela/sideways-panes'
import { usePhoneOnItsSide } from '@/hooks/usePhone'
import { cn } from '@/lib/utils'
import { RESERVATION_STATE_COLUMN } from '@/components/reservations/reservation-state-chip'
import { WHEN_LABELS } from '@/lib/when-terms'

const COLUMNS: {
  label: string
  width: string
  hidden?: boolean
  narrow?: boolean
}[] = [
  {
    label: '詳細の開閉',
    width: 'calc(34rem/16)',
    hidden: true,
    narrow: true,
  },
  { label: '番組', width: 'calc(260rem/16)' },
  { label: 'チャンネル', width: 'calc(150rem/16)' },
  { label: WHEN_LABELS.broadcast, width: 'calc(190rem/16)' },
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
      variant="tone"
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
  const lines = linesOf(items)
  const [relaysOpen, setRelaysOpen] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        lines.flatMap((line) =>
          line.kind === 'relay' &&
          line.segments.some((one) => one.id === firstConflict)
            ? [line.key]
            : [],
        ),
      ),
  )
  const toggleRelay = useCallback(
    (key: string) =>
      setRelaysOpen((prev) => {
        const next = new Set(prev)

        if (!next.delete(key)) {
          next.add(key)
        }

        return next
      }),
    [],
  )
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  const sideways = usePhoneOnItsSide()
  const [besideId, setBesideId] = useState<string>()
  const pick = useCallback(
    (ids: readonly string[], taken: boolean) =>
      setPicked((prev) => {
        const next = new Set(prev)

        for (const id of ids) {
          if (taken) {
            next.add(id)
          } else {
            next.delete(id)
          }
        }

        return next
      }),
    [],
  )
  const chosen = items.filter((one) => picked.has(one.id))
  const pressed = items.find((one) => one.id === besideId)
  const conflicts = items.filter(
    (one) => one.standing === 'conflict' && one.conflict,
  )
  const clear = useCallback(() => setPicked(new Set()), [])
  const router = useRouter()
  const [waiting, startWaiting] = useTransition()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const go = useCallback(
    (patch: Record<string, string | undefined>) => {
      startWaiting(() =>
        router.replace(
          addressWith(pathname, searchParams.toString(), patch) as Route,
          { scroll: false },
        ),
      )
    },
    [router, pathname, searchParams],
  )
  const onShowChange = useCallback(
    (next: string) => {
      go({ [SHOW_PARAM]: next === EVERY ? EVERY : undefined })
    },
    [go],
  )
  const onDriftPick = useCallback(
    (kind: EpgDriftKind) => {
      go({ [EPG_PARAM]: filter.epg === kind ? undefined : kind })
    },
    [go, filter.epg],
  )
  const onClearFilters = useCallback(() => {
    go({ [SHOW_PARAM]: EVERY, [EPG_PARAM]: undefined })
  }, [go])

  const rowOf = (
    reservation: Reservation,
    nth: number,
    segment?: { nth: number; of: number },
  ) => (
    <ReservationRow
      key={reservation.id}
      nth={nth}
      segment={segment}
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
      selected={picked.has(reservation.id)}
      onSelect={(taken) => pick([reservation.id], taken)}
    />
  )

  return (
    <ScreenMain
      scroll="within"
      className="flex flex-col px-3.5 pt-6 pb-6 phone:pt-1 min-[701px]:px-5 min-[1061px]:px-[calc(30rem/16)]"
    >
      <h1 className="heading phone:sr-only mb-3.5 flex items-center gap-2 text-[calc(20rem/16)]">
        <ReservationIcon className="size-[calc(18rem/16)] text-brand" />
        予約
      </h1>
      <PhoneBarTools>
        <PhoneBarLink href="/guide" aria-label="予約を追加">
          <PlusIcon />
        </PhoneBarLink>
      </PhoneBarTools>
      <ReservationTabs
        current="reservations"
        action={
          <Button size="sm" asChild className="phone:hidden">
            <Link href="/guide">
              <PlusIcon />
              予約を追加
            </Link>
          </Button>
        }
      />

      <div className="mb-3.5 flex flex-wrap items-center gap-3 rounded-xl bg-surface px-[calc(17rem/16)] py-[calc(13rem/16)]">
        <SegmentedControl
          label="表示"
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

      {items.length > 0 && sideways && (
        <SidewaysPanes
          detailLabel="予約の詳細"
          list={
            <PhoneReservationRows
              reservations={items}
              now={new Date()}
              actions={actions}
              chosenId={besideId}
              onChoose={(one) => setBesideId(one.id)}
              className="mx-0 [&>section:first-child>h2]:pt-3"
            />
          }
          detail={
            pressed ? (
              <ReservationBeside
                reservation={pressed}
                actions={actions}
                onDone={() => setBesideId(undefined)}
              />
            ) : conflicts.length > 0 ? (
              <div className="flex flex-col gap-3">
                {conflicts.map((one) => (
                  <PhoneConflict
                    key={one.id}
                    reservation={one}
                    onRaise={actions.onRaise}
                  />
                ))}
              </div>
            ) : (
              items[0] && (
                <ReservationBeside
                  reservation={items[0]}
                  actions={actions}
                  onDone={() => setBesideId(undefined)}
                />
              )
            )
          }
        />
      )}
      {items.length > 0 && (
        <OnAnUprightPhone>
          <div
            data-slot="phone-reservations"
            className="-mx-3.5 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3.5 pb-6"
          >
            {items
              .filter((one) => one.standing === 'conflict' && one.conflict)
              .map((one) => (
                <PhoneConflict
                  key={one.id}
                  reservation={one}
                  onRaise={actions.onRaise}
                />
              ))}
            <PhoneReservationRows
              reservations={items}
              now={new Date()}
              actions={actions}
            />
          </div>
        </OnAnUprightPhone>
      )}
      {items.length === 0 ? (
        <EmptyState
          title={total === 0 ? '予約がありません' : '未完了の予約がありません'}
          titleLevel={2}
          className="mt-10 max-w-[calc(560rem/16)]"
          action={
            total === 0 ? undefined : (
              <Button variant="tone" size="sm" onClick={onClearFilters}>
                条件を解除
              </Button>
            )
          }
        />
      ) : (
        <Table
          cards
          className="table-fixed min-w-[calc(960rem/16)]"
          waiting={waiting}
          containerClassName="min-h-0 flex-initial overflow-y-auto pb-1 phone:hidden"
        >
          <TableColumns
            widths={[
              'calc(44rem/16)',
              ...COLUMNS.map((column) => column.width),
            ]}
          />
          <TableHeader className="[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10 [&>tr>th]:py-[calc(14rem/16)]">
            <TableRow>
              <TableHead {...cardPlace('select')} className="w-11">
                <SelectEvery>
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
                </SelectEvery>
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
          <TableBody>
            {lines.map((line, nth) => {
              if (line.kind === 'one') {
                return rowOf(line.reservation, nth)
              }

              const open = relaysOpen.has(line.key)

              return [
                <RelayRow
                  key={line.key}
                  segments={line.segments}
                  nth={nth}
                  open={open}
                  onToggle={() => toggleRelay(line.key)}
                  chosen={
                    line.segments.filter((one) => picked.has(one.id)).length
                  }
                  onSelect={(taken) =>
                    pick(
                      line.segments.map((one) => one.id),
                      taken,
                    )
                  }
                />,
                ...(open
                  ? line.segments.map((one, at) =>
                      rowOf(one, at, {
                        nth: one.relay?.nth ?? at + 1,
                        of: one.relay?.of ?? line.segments.length,
                      }),
                    )
                  : []),
              ]
            })}
          </TableBody>
        </Table>
      )}
    </ScreenMain>
  )
}
