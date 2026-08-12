'use client'

import { useState } from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import type { Reservation } from '@/repository/reservations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Banner } from '@/components/vela/banner'
import { ChipDot } from '@/components/vela/status'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ListIcon,
  PlusIcon,
  WarningIcon,
} from '@/components/vela/icons'
import { ReservationTabs } from '@/page-component/reservations/reservation-tabs'

export function ReservationsView({
  reservations,
}: {
  reservations: Reservation[]
}) {
  const [expanded, setExpanded] = useState<string | null>(
    reservations.find((r) => r.state === 'conflict')?.id ?? null,
  )

  return (
    <main className="flex-1 px-3.5 pt-6 pb-16 min-[701px]:px-5 min-[1061px]:px-[30px]">
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

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <table className="w-full min-w-[900px] border-separate border-spacing-0">
          <thead>
            <tr>
              {['', '番組', 'チャンネル', '放送日時', '由来', '状態', ''].map(
                (h, i) => (
                  <th
                    key={i}
                    className="bg-surface-2 px-3.5 py-[9px] text-left text-[10.5px] font-bold tracking-[0.05em] whitespace-nowrap text-ink-3 first:w-8 first:rounded-l-md last:rounded-r-md"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <ReservationRow
                key={r.id}
                reservation={r}
                expanded={expanded === r.id}
                onToggle={() =>
                  setExpanded((prev) => (prev === r.id ? null : r.id))
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}

function ReservationRow({
  reservation: r,
  expanded,
  onToggle,
}: {
  reservation: Reservation
  expanded: boolean
  onToggle: () => void
}) {
  const conflict = r.state === 'conflict'

  return (
    <>
      <tr className={cn(conflict && 'bg-coral-soft/40')}>
        <Td>
          {conflict && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-label="競合の詳細"
              onClick={onToggle}
              className="flex size-6 cursor-pointer items-center justify-center rounded-full text-coral transition-colors duration-150 hover:bg-coral-soft [&_svg]:size-3.5"
            >
              {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
            </button>
          )}
        </Td>
        <Td>
          <b className="block text-[13px] font-bold">{r.title}</b>
          {r.note && <span className="text-note text-ink-3">{r.note}</span>}
        </Td>
        <Td className="text-ui whitespace-nowrap">
          {r.channelName}
          <small className="ml-1.5 font-code text-[10.5px] text-ink-3">
            {r.channelNo}
          </small>
        </Td>
        <Td className="font-code text-ui whitespace-nowrap text-ink-2">
          {r.whenLabel}
          {r.whenNote && (
            <small className="block font-sans text-[10.5px] text-ink-3">
              {r.whenNote}
            </small>
          )}
        </Td>
        <Td className="whitespace-nowrap">
          {r.ruleName ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-[11px] py-0.5 text-note text-ink-2">
              <ListIcon className="size-3" />
              {r.ruleName}
            </span>
          ) : (
            <span className="text-ui text-ink-2">{r.origin}</span>
          )}
        </Td>
        <Td>
          <StateChip reservation={r} />
          {r.stateNote && (
            <span className="mt-[3px] block text-[10.5px] leading-relaxed text-ink-3">
              {r.stateNote}
            </span>
          )}
        </Td>
        <Td className="text-right whitespace-nowrap">
          <Button
            variant="outline"
            size="sm"
            disabled
            title="予約の編集はこれから実装されます"
          >
            編集
          </Button>
        </Td>
      </tr>
      {conflict && expanded && r.conflict && (
        <tr>
          <td colSpan={7} className="px-3.5 pb-3">
            <div className="rounded-lg bg-surface px-4 py-3.5">
              <div className="flex items-center gap-1.5 text-ui font-bold text-coral">
                <WarningIcon className="size-4" />
                {r.conflict.headline}
              </div>
              <p className="mt-1 text-sub leading-relaxed text-ink-2">
                {r.conflict.body}
              </p>
              <div className="mt-2.5 space-y-1.5">
                {r.conflict.entries.map((e) => (
                  <div
                    key={e.title}
                    className="flex flex-wrap items-center gap-3 rounded-md bg-surface-2 px-3 py-2 text-sub"
                  >
                    <span className="min-w-0 flex-1 font-medium">
                      {e.title}
                    </span>
                    <span className="font-code text-ink-2">{e.meta}</span>
                    <span className="text-ink-3">{e.ruleName ?? e.origin}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-note leading-relaxed text-ink-3">
                優先度を上げると、上のいずれかの予約が代わりに競合となります。
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  title="優先度の変更はこれから実装されます"
                >
                  この予約の優先度を上げる
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled
                  title="予約の取り消しはこれから実装されます"
                >
                  この予約を取り消す
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/settings/tuners">
                    チューナーの使用状況を見る
                  </Link>
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function StateChip({ reservation: r }: { reservation: Reservation }) {
  switch (r.state) {
    case 'secured':
      return (
        <Badge variant="ok" className="font-bold">
          <ChipDot />
          チューナー確保済み
        </Badge>
      )
    case 'conflict':
      return (
        <Badge variant="err" className="font-bold">
          <ChipDot />
          競合
        </Badge>
      )
    case 'endUndecided':
      return <Badge variant="warn">終了未定</Badge>
    case 'recording':
      return (
        <Badge variant="recording">
          <ChipDot />
          録画中
        </Badge>
      )
  }
}

function Td({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      className={cn(
        'border-b border-dashed border-line px-3.5 py-3 align-top text-[13px]',
        className,
      )}
      {...props}
    />
  )
}
