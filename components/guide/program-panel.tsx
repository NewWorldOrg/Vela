'use client'

import { useState, useTransition } from 'react'

import type { Channel } from '@/repository/channels'
import type { Program } from '@/repository/programs'
import type {
  ReservationRevision,
  ReservationWrite,
} from '@/repository/reservations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SuccessIcon } from '@/components/vela/icons'
import { InlineAlert } from '@/components/vela/banner'
import { EditReservationDialog } from '@/components/reservations/edit-reservation-dialog'
import { ProgramDetailBody } from '@/components/guide/program-detail'

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
      <DialogContent size="reading" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="pr-[30px]">{program.title}</DialogTitle>
        </DialogHeader>
        <div data-slot="dialog-body" className="min-h-0 overflow-y-auto pb-2.5">
          <ProgramDetailBody
            program={program}
            channel={channel}
            dayLabel={dayLabel}
            onReserve={onReserve}
            reservation={
              booking && (
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
              )
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
