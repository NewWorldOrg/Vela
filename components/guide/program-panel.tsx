'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

import type { Channel } from '@/repository/channels'
import type { Program } from '@/repository/programs'
import type {
  ReservationRevision,
  ReservationWrite,
} from '@/repository/reservations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PlusIcon, SuccessIcon } from '@/components/vela/icons'
import { InlineAlert } from '@/components/vela/banner'
import { EditReservationDialog } from '@/components/reservations/edit-reservation-dialog'
import { ReserveButton } from '@/components/guide/reserve-button'

const SIGNED_OUT =
  'サインインが切れているため、操作できませんでした。サインインしてから開き直してください。'

/**
 * How tall the surface is allowed to get, as a share of the window rather than
 * a number of pixels. The width is the shared dialog's own — relative below the
 * cap it sets and at the cap above it — and nothing here writes a second one.
 *
 * The floor is the content: a programme with no synopsis draws a short surface.
 * The ceiling leaves the guide showing around every edge, which is what tells a
 * layer over the grid apart from a page in front of it. Past it the body
 * scrolls inside, so the title and the way out stay where they were put.
 */
const AS_TALL_AS = 'max-h-[85dvh] grid-rows-[auto_minmax(0,1fr)]'

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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose()
        }
      }}
    >
      {/* Nothing here is written into, so a press beside the surface is a
          decision to leave rather than a miss that would cost an entry — which
          is the one case SPEC holds a surface open through. A cell of the grid
          is beside it like anything else, so the first press on one shuts this
          and the programme underneath is not swapped in behind the reader. */}
      <DialogContent aria-describedby={undefined} className={AS_TALL_AS}>
        <DialogHeader>
          <DialogTitle className="pr-[30px]">{program.title}</DialogTitle>
        </DialogHeader>
        <div data-program-scroll className="min-h-0 overflow-y-auto pb-2.5">
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
      </DialogContent>
    </Dialog>
  )
}
