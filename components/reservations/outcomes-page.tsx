'use client'

import { useCallback, useState } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import type { OutcomeLedgerResult } from '@/repository/reservation-outcomes'
import { cn } from '@/lib/utils'
import { OUTCOME_KINDS, OUTCOME_SPANS } from '@/lib/reservation-outcomes'
import {
  NOT_YET_IN_THIS_BUILD_TERM,
  RESERVATION_OUTCOME_KIND_TERMS,
} from '@/lib/state-terms'
import { shapeFor } from '@/lib/not-yet-in-this-build'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableColumns,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { OUTCOME_KIND_COLUMN } from '@/components/reservations/outcome-kind-chip'
import { ScreenMain } from '@/components/vela/app-shell'
import { EmptyState } from '@/components/vela/empty-state'
import { FilterSelect } from '@/components/vela/filter-select'
import { Pager } from '@/components/vela/pager'
import { SegmentedControl } from '@/components/vela/segmented-control'
import { OutcomeRow } from '@/components/reservations/outcome-row'
import { unfoldShows, useUnfolding } from '@/components/vela/unfold'
import { ReservationTabs } from '@/components/reservations/reservation-tabs'
import { WHEN_LABELS } from '@/lib/when-terms'
import { useArrived } from '@/hooks/useArrived'

/*
 * 番組 and 由来 share the room left over; the rest is the longer of the heading
 * and the longest value with 1.5rem of room (`08/08(金) 21:10 - 22:40` in the
 * code face, the widest classification word, a priority of two figures).
 */
const COLUMNS: {
  label: string
  width: string
  hidden?: boolean
  narrow?: boolean
}[] = [
  {
    label: '代わりに録られた予約の開閉',
    width: 'calc(34rem/16)',
    hidden: true,
    narrow: true,
  },
  { label: '番組', width: 'calc(300rem/16)' },
  { label: 'チャンネル', width: 'calc(168rem/16)' },
  { label: WHEN_LABELS.broadcast, width: 'calc(210rem/16)' },
  { label: '由来', width: 'calc(180rem/16)' },
  { label: '優先度', width: 'calc(76rem/16)' },
  { label: '分類', width: OUTCOME_KIND_COLUMN },
  { label: WHEN_LABELS.taken, width: 'calc(168rem/16)' },
]

const EVERY = '__every__'

const KIND_OPTIONS = [
  { value: EVERY, label: 'すべて' },
  ...OUTCOME_KINDS.map((kind) => ({
    value: kind,
    label: shapeFor(
      RESERVATION_OUTCOME_KIND_TERMS,
      kind,
      NOT_YET_IN_THIS_BUILD_TERM,
    ).label,
  })),
]

export function OutcomeLedgerView({ result }: { result: OutcomeLedgerResult }) {
  const { items, total, page, lastPage, filter, channels, rules } = result
  const unfolded = useUnfolding()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const change = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }

      params.delete('page')

      const qs = params.toString()

      router.replace((qs ? `${pathname}?${qs}` : pathname) as Route, {
        scroll: false,
      })
    },
    [router, pathname, searchParams],
  )
  const onPage = useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams.toString())

      if (next > 1) {
        params.set('page', String(next))
      } else {
        params.delete('page')
      }

      const qs = params.toString()

      router.replace((qs ? `${pathname}?${qs}` : pathname) as Route, {
        scroll: false,
      })
    },
    [router, pathname, searchParams],
  )
  const arrived = useArrived()
  const emptyLedger =
    total === 0 && !(filter.kind || filter.days || filter.ch || filter.rule)

  return (
    <ScreenMain
      scroll="within"
      className="flex flex-col px-3.5 pt-6 pb-6 min-[701px]:px-5 min-[1061px]:px-[calc(30rem/16)]"
    >
      <ReservationTabs current="outcomes" />

      <div className="mb-3.5 flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-xl bg-surface px-[calc(17rem/16)] py-[calc(13rem/16)]">
        <span className="text-ui font-medium whitespace-nowrap text-ink-2">
          分類
        </span>
        <SegmentedControl
          aria-label="分類"
          options={KIND_OPTIONS}
          value={filter.kind ?? EVERY}
          onValueChange={(next) =>
            change({ kind: next === EVERY ? null : next })
          }
        />
        <FilterSelect
          prefix="期間"
          value={filter.days}
          options={OUTCOME_SPANS}
          onChange={(next) => change({ days: next })}
        />
        <FilterSelect
          prefix="チャンネル"
          value={filter.ch}
          options={channels}
          onChange={(next) => change({ ch: next })}
        />
        <FilterSelect
          prefix="ルール"
          value={filter.rule}
          options={rules}
          onChange={(next) => change({ rule: next })}
        />
        <span className="ml-auto text-sub whitespace-nowrap text-ink-2 max-[900px]:ml-0">
          全 <b className="font-code font-medium text-ink">{total}</b> 件
        </span>
      </div>

      {items.length > 0 ? (
        <>
          <Table
            className="table-fixed min-w-[calc(1040rem/16)]"
            containerClassName="min-h-0 flex-1 overflow-y-auto pb-1"
          >
            <TableColumns widths={COLUMNS.map((column) => column.width)} />
            <TableHeader className="[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10">
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHead
                    key={column.label}
                    className={cn(
                      column.narrow && 'w-8',
                      column.label === '優先度' && 'text-right',
                    )}
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
            <TableBody {...arrived}>
              {items.map((outcome, nth) => (
                <OutcomeRow
                  key={outcome.id}
                  nth={nth}
                  outcome={outcome}
                  expanded={unfolded.open === outcome.id}
                  shown={unfoldShows(unfolded, outcome.id)}
                  onToggle={() => unfolded.toggle(outcome.id)}
                  onSettle={() => unfolded.settle(outcome.id)}
                />
              ))}
            </TableBody>
          </Table>
          {lastPage > 1 && (
            <Pager
              total={total}
              page={page}
              lastPage={lastPage}
              onPage={onPage}
            />
          )}
        </>
      ) : !emptyLedger ? (
        <EmptyState
          spot="tape"
          title="条件に合う記録がありません"
          titleLevel={2}
          className="mt-10 max-w-[calc(560rem/16)]"
          action={
            <Button
              variant="halt"
              size="sm"
              onClick={() =>
                change({ kind: null, days: null, ch: null, rule: null })
              }
            >
              条件を消す
            </Button>
          }
        />
      ) : (
        <EmptyState
          spot="star"
          title="録れなかった予約はありません"
          titleLevel={2}
          className="mt-10 max-w-[calc(560rem/16)]"
          action={
            <Button variant="watch" size="sm" asChild>
              <Link href="/reservations">予約一覧へ</Link>
            </Button>
          }
        />
      )}
    </ScreenMain>
  )
}
