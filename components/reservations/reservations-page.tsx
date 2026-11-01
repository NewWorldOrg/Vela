'use client'

import { useCallback, useState, useTransition } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { addressWith } from '@/lib/path'
import type {
  EpgDriftKind,
  Reservation,
  ReservationsResult,
} from '@/repository/reservations'
import type { TunerRow } from '@/repository/tuners'
import {
  RESERVATION_EPG_DIVERGED_TERM,
  RESERVATION_EPG_MISSING_TERM,
} from '@/lib/state-terms'
import { calendarDayOf, dayHeadingOf } from '@/lib/library-days'
import { whatIsLost } from '@/lib/conflict-line'
import { linesOf, type ReservationLine } from '@/lib/reservations'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/vela/empty-state'
import { PlusIcon } from '@/components/vela/icons'
import { iconButtonVariants } from '@/components/vela/icon-button'
import { SegmentedControl } from '@/components/vela/segmented-control'
import { waitsWhile } from '@/components/vela/waiting'
import type { ReservationActions } from '@/components/reservations/reservation-row'
import { ReservationRow } from '@/components/reservations/reservation-row'
import { RelayRow } from '@/components/reservations/relay-row'
import type { ReservationBulkActions } from '@/components/reservations/reservation-selection'
import { ReservationSelection } from '@/components/reservations/reservation-selection'
import { ReservationTabs } from '@/components/reservations/reservation-tabs'
import { ConflictPanel } from '@/components/reservations/conflict-panel'
import { NextRecording } from '@/components/reservations/next-recording'
import { ScreenMain } from '@/components/vela/app-shell'
import { PhoneBarLink, PhoneBarTools } from '@/components/vela/phone-bar-tools'
import { OnAnUprightPhone } from '@/components/vela/on-an-upright-phone'
import {
  PhoneReservationRows,
  ReservationBeside,
} from '@/components/reservations/phone-reservations'
import { SidewaysPanes } from '@/components/vela/sideways-panes'
import { usePhoneOnItsSide } from '@/hooks/usePhone'
import { cn } from '@/lib/utils'

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
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'tap-target inline-flex h-8 cursor-pointer items-center gap-1 rounded-full px-3.5 text-ui font-medium whitespace-nowrap outline-none',
        'transition-[background-color,color] duration-[140ms] ease-toy focus-visible:shadow-ring active:scale-[0.98]',
        pressed
          ? 'bg-accent-tint font-semibold text-acc-text'
          : 'bg-surface text-ink hover:bg-surface-2',
      )}
    >
      {label} <b className="font-code font-semibold tabular-nums">{count}</b> 件
    </button>
  )
}

/** What a conflicting reservation goes without, read from the overlap of its broadcast with the ones that keep the tuner. */
function lossOf(reservation: Reservation): string | undefined {
  const kept = (reservation.conflict?.entries ?? []).flatMap((entry) =>
    entry.span ? [entry.span] : [],
  )

  return reservation.span && kept.length > 0
    ? whatIsLost(kept, reservation.span)
    : undefined
}

function startOf(line: ReservationLine): string | undefined {
  return line.kind === 'one'
    ? line.reservation.span?.startAt
    : (line.segments[0].relay?.wholeStartAt ?? line.segments[0].span?.startAt)
}

/** The lines in the order given, gathered under the day each starts on; a day keeps the place of its first line. */
function daysOf(
  lines: readonly ReservationLine[],
): { day: string; lines: ReservationLine[] }[] {
  const days: { day: string; lines: ReservationLine[] }[] = []

  for (const line of lines) {
    const start = startOf(line)
    const day = start ? calendarDayOf(start) : ''
    const found = days.find((one) => one.day === day)

    if (found) {
      found.lines.push(line)
    } else {
      days.push({ day, lines: [line] })
    }
  }

  return days
}

export function ReservationsView({
  result,
  actions,
  bulk,
  tuners,
}: {
  result: ReservationsResult
  actions: ReservationActions
  bulk: ReservationBulkActions
  /** The tuners as they stand, for the chips under the next recording; left out when they cannot be read. */
  tuners?: TunerRow[]
}) {
  const { items, total, drift, filter } = result
  const lines = linesOf(items)
  const [open, setOpen] = useState<string>()
  const firstConflict = items.find((one) => one.standing === 'conflict')?.id
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
  const [picking, setPicking] = useState(false)
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
      setPicked(new Set())
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
  const now = new Date()
  const narrowed = items.length !== total
  const wait = waitsWhile(waiting)
  const hasSide =
    conflicts.length > 0 ||
    items.some((one) => one.standing === 'scheduled' && one.span)

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
      open={open === reservation.id}
      onToggle={() =>
        setOpen((was) => (was === reservation.id ? undefined : reservation.id))
      }
      picking={picking}
      selected={picked.has(reservation.id)}
      onSelect={(taken) => pick([reservation.id], taken)}
      loses={
        reservation.standing === 'conflict' ? lossOf(reservation) : undefined
      }
    />
  )

  const countSaying = narrowed ? (
    <>
      <span className="font-code">{items.length}</span> /{' '}
      <span className="font-code">{total}</span> 件
    </>
  ) : (
    <>
      <span className="font-code">{total}</span> 件
    </>
  )

  const filters = (
    <div
      data-slot="reservation-filters"
      className="flex flex-wrap items-center gap-x-2.5 gap-y-2 phone:px-1 phone:py-1"
    >
      <SegmentedControl
        label="表示"
        size="band"
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
      <span className="ml-auto hidden text-sub whitespace-nowrap text-ink-2 phone:inline">
        {narrowed ? (
          <>
            該当 <span className="font-code">{items.length}</span> 件 / 全{' '}
            <span className="font-code">{total}</span> 件
          </>
        ) : (
          <>
            全 <span className="font-code">{total}</span> 件
          </>
        )}
      </span>
      {items.length > 0 && (
        <button
          type="button"
          aria-pressed={picking}
          onClick={() => {
            setPicking(!picking)
            setPicked(new Set())
          }}
          className={cn(
            iconButtonVariants(),
            'ml-auto h-8 w-auto px-4 text-ui font-semibold text-ink phone:hidden',
            picking && 'bg-accent-tint text-acc-text hover:bg-accent-tint',
          )}
        >
          選ぶ
        </button>
      )}
    </div>
  )

  const empty = (
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
  )

  const side = (
    <>
      {conflicts.map((one) => (
        <ConflictPanel
          key={one.id}
          reservation={one}
          onRaise={actions.onRaise}
        />
      ))}
      <NextRecording reservations={items} tuners={tuners} />
    </>
  )

  return (
    <ScreenMain
      scroll="within"
      className="flex flex-col px-3.5 pt-3.5 phone:pt-1 min-[701px]:px-6 min-[1366px]:px-10"
    >
      <PhoneBarTools>
        <PhoneBarLink href="/guide" aria-label="予約を追加">
          <PlusIcon />
        </PhoneBarLink>
      </PhoneBarTools>
      <ReservationTabs
        current="reservations"
        count={countSaying}
        action={
          <Button asChild>
            <Link href="/guide">
              <PlusIcon />
              予約を追加
            </Link>
          </Button>
        }
      />

      <div className="hidden phone:block">{filters}</div>

      {items.length > 0 && sideways && (
        <SidewaysPanes
          detailLabel="予約の詳細"
          list={
            <PhoneReservationRows
              reservations={items}
              now={now}
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
                  <ConflictPanel
                    key={one.id}
                    on="phone"
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
            className="-mx-3.5 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3.5 pt-1 pb-6"
          >
            {conflicts.map((one) => (
              <ConflictPanel
                key={one.id}
                on="phone"
                reservation={one}
                onRaise={actions.onRaise}
              />
            ))}
            <PhoneReservationRows
              reservations={items}
              now={now}
              actions={actions}
            />
          </div>
        </OnAnUprightPhone>
      )}
      {items.length === 0 && <div className="hidden phone:block">{empty}</div>}

      <div
        data-slot="reservations-columns"
        className={cn(
          'mt-4 grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-6 phone:hidden',
          hasSide &&
            'min-[1000px]:grid-cols-[minmax(0,1fr)_calc(360rem/16)] min-[1366px]:grid-cols-[minmax(0,1fr)_calc(420rem/16)] min-[1366px]:gap-9 max-[999px]:grid-rows-none',
        )}
      >
        <div className="flex min-h-0 flex-col max-[999px]:order-2">
          {filters}
          {picking && items.length > 0 && (
            <div className="mt-3 flex items-center gap-3 px-2.5">
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
              <span aria-hidden="true" className="text-sub text-ink-2">
                すべて選ぶ
              </span>
            </div>
          )}
          {chosen.length > 0 && (
            <ReservationSelection
              chosen={chosen}
              onClear={clear}
              actions={bulk}
              className="mt-3 mb-0"
            />
          )}
          {items.length === 0 ? (
            empty
          ) : (
            <div
              data-slot="reservation-list"
              aria-busy={waiting || undefined}
              inert={wait.inert}
              className={cn(
                'min-h-0 flex-initial overflow-y-auto pb-6',
                wait.className,
              )}
            >
              {daysOf(lines).map(({ day, lines: theirs }) => {
                const heading = day ? dayHeadingOf(day, now) : undefined

                return (
                  <section
                    key={day}
                    aria-label={
                      heading ? (heading.near ?? heading.date) : '予約'
                    }
                  >
                    {heading && (
                      <h2 className="mt-5 mb-1.5 ml-2.5 flex items-baseline gap-1.5 text-ui font-semibold text-ink">
                        {heading.near ?? (
                          <span className="font-code">{heading.date}</span>
                        )}
                        {heading.near && (
                          <span className="font-code font-medium text-ink-2">
                            {heading.date}
                          </span>
                        )}
                      </h2>
                    )}
                    <ul>
                      {theirs.map((line, nth) => {
                        if (line.kind === 'one') {
                          return rowOf(line.reservation, nth)
                        }

                        const relayOpen = relaysOpen.has(line.key)

                        return [
                          <RelayRow
                            key={line.key}
                            segments={line.segments}
                            nth={nth}
                            open={relayOpen}
                            onToggle={() => toggleRelay(line.key)}
                            picking={picking}
                            chosen={
                              line.segments.filter((one) => picked.has(one.id))
                                .length
                            }
                            onSelect={(taken) =>
                              pick(
                                line.segments.map((one) => one.id),
                                taken,
                              )
                            }
                          />,
                          ...(relayOpen
                            ? line.segments.map((one, at) =>
                                rowOf(one, at, {
                                  nth: one.relay?.nth ?? at + 1,
                                  of: one.relay?.of ?? line.segments.length,
                                }),
                              )
                            : []),
                        ]
                      })}
                    </ul>
                  </section>
                )
              })}
            </div>
          )}
        </div>
        {hasSide && (
          <aside
            aria-label="競合と次の録画"
            className="flex min-h-0 flex-col gap-4 overflow-y-auto pb-6 max-[999px]:order-1 max-[999px]:pb-0"
          >
            {side}
          </aside>
        )}
      </div>
    </ScreenMain>
  )
}
