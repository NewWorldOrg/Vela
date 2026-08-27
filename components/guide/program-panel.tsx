'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

import { useDismissable } from '@/hooks/useDismissable'
import { cn } from '@/lib/utils'
import type { Channel } from '@/repository/channels'
import type { Program } from '@/repository/programs'
import type {
  ReservationRevision,
  ReservationWrite,
} from '@/repository/reservations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/vela/icon-button'
import { CloseIcon, PlusIcon, SuccessIcon } from '@/components/vela/icons'
import { InlineAlert } from '@/components/vela/banner'
import { EditReservationDialog } from '@/components/reservations/edit-reservation-dialog'
import { ReserveButton } from '@/components/guide/reserve-button'

const SIGNED_OUT =
  'サインインが切れているため、操作できませんでした。サインインしてから開き直してください。'

export function ProgramPanel({
  program,
  channel,
  dayLabel,
  open,
  onClose,
  onReserve,
  onCancel,
  onRevise,
}: {
  program: Program
  channel?: Channel
  dayLabel: string
  open: boolean
  onClose: () => void
  onReserve: (programmeId: string) => Promise<ReservationWrite>
  onCancel: (id: string) => Promise<ReservationWrite>
  onRevise: (
    id: string,
    revision: ReservationRevision,
  ) => Promise<ReservationWrite>
}) {
  const panel = useDismissable<HTMLElement>({
    open,
    onDismiss: onClose,
    opener: 'program-panel',
  })
  const [pending, startTransition] = useTransition()
  const [refusal, setRefusal] = useState<string>()
  const [editing, setEditing] = useState(false)
  const booking = program.booking

  const drop = () => {
    if (!booking) {
      return
    }

    startTransition(async () => {
      setRefusal(undefined)

      const result = await onCancel(booking.id)

      setRefusal(
        result.state === 'unauthenticated'
          ? SIGNED_OUT
          : result.state === 'rejected'
            ? result.message
            : undefined,
      )
    })
  }

  return (
    <aside
      ref={panel}
      tabIndex={-1}
      aria-hidden={!open}
      inert={!open}
      data-cursor-shut={!open ? 'the panel is shut' : undefined}
      className={cn(
        'fixed top-[66px] right-[18px] bottom-[18px] z-40 flex w-[400px] flex-col overflow-hidden rounded-xl border border-line-strong bg-surface shadow-pop-xl outline-none transition-transform duration-200 ease-toy',
        'max-[900px]:top-auto max-[900px]:right-3 max-[900px]:bottom-3 max-[900px]:left-3 max-[900px]:max-h-[56vh] max-[900px]:w-auto',
        !open &&
          'translate-x-[calc(100%+30px)] max-[900px]:translate-x-0 max-[900px]:translate-y-[calc(100%+30px)]',
      )}
    >
      <div className="flex items-start gap-2.5 px-5 pt-[18px]">
        <h2 className="heading min-w-0 flex-1 text-[16px] leading-normal">
          {program.title}
        </h2>
        <IconButton
          aria-label="閉じる"
          variant="quiet"
          size="sm"
          onClick={onClose}
        >
          <CloseIcon />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-2.5 pb-5">
        <p className="text-ui text-ink-2">
          <b className="mr-[7px] font-code font-medium text-ink">
            {channel?.no}
          </b>
          {channel?.name}
        </p>
        <p className="mt-0.5 font-code text-[13.5px] font-medium tabular-nums">
          {program.dateLabel ?? dayLabel} {program.startLabel}–
          {program.endUndecided ? '終了未定' : program.endLabel}
        </p>
        <div className="mt-[11px] flex flex-wrap gap-1.5">
          <Badge>{program.genreLabel}</Badge>
          {program.subtitled && <Badge variant="info">字幕あり</Badge>}
        </div>
        {program.description && (
          <p className="mt-[13px] text-ui leading-[1.9] whitespace-pre-wrap text-ink-2">
            {program.description}
          </p>
        )}
        <hr className="my-4 border-t border-dashed border-line" />

        {booking ? (
          <>
            <div className="rounded-lg bg-mint-soft px-3.5 py-3">
              <div className="flex items-center gap-1.5 text-ui font-bold text-mint">
                <SuccessIcon className="size-4" />
                チューナー確保済み
              </div>
              <p className="mt-1 text-sub leading-relaxed text-ink-2 [word-break:auto-phrase]">
                <b>地上波</b>のチューナーを 1 本、
                {program.dateLabel ?? dayLabel} {program.startLabel} の 10
                秒前から確保しました。
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  予約を編集
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={pending}
                  onClick={drop}
                >
                  予約を取り消す
                </Button>
                {refusal && (
                  <span aria-live="polite" className="basis-full">
                    <InlineAlert tone="warn">{refusal}</InlineAlert>
                  </span>
                )}
              </div>
              {/* Mounted only while it is open, so each opening reads the
                  reservation as it stands. */}
              {editing && (
                <EditReservationDialog
                  booking={{ ...booking, title: program.title }}
                  open
                  onOpenChange={setEditing}
                  onRevise={onRevise}
                />
              )}
            </div>
            <p className="mt-2.5 text-note leading-relaxed text-ink-3">
              録画の 10 秒前から開始し、終了 30 秒後まで延長に追従します。
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <ReserveButton programmeId={program.id} onReserve={onReserve}>
                <PlusIcon />
                録画予約
              </ReserveButton>
              <Button
                variant="ghost"
                disabled
                title="シリーズ予約はこれから実装されます"
              >
                シリーズで予約
              </Button>
            </div>
            <p className="mt-2.5 text-note leading-relaxed text-ink-3">
              予約した時点でチューナーを確保します。空きがない場合はこの場で競合として提示します。
            </p>
          </>
        )}

        <Button variant="ghost" size="sm" className="mt-4 w-full" asChild>
          <Link href={`/guide/programs/${program.id}`}>番組詳細を開く</Link>
        </Button>
      </div>
    </aside>
  )
}
