'use client'

import { useState, useTransition } from 'react'

import { signedOut } from '@/lib/signed-out'
import type { Channel } from '@/repository/channels'
import { CHANNEL_KIND_LABEL } from '@/repository/channels'
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
import { RECORDING_IN_PROGRESS_TERM } from '@/lib/state-terms'
import {
  CloseIcon,
  EditIcon,
  RecordIcon,
  SuccessIcon,
} from '@/components/vela/icons'
import { ActionRow } from '@/components/vela/action-row'
import { InlineAlert } from '@/components/vela/banner'
import { EditReservationDialog } from '@/components/reservations/edit-reservation-dialog'
import { ProgramDetailBody } from '@/components/guide/program-detail'

const SIGNED_OUT = signedOut('操作')

export function ProgramPanel({
  program,
  channel,
  dayLabel,
  onAir,
  open,
  onClose,
  onReserve,
  onCancel,
  onRevise,
  extras,
}: {
  program: Program
  extras?: 'waiting' | 'failed'
  channel?: Channel
  dayLabel: string
  onAir?: boolean
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
      <DialogContent size="reading" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="pr-[calc(30rem/16)]">
            {program.title}
          </DialogTitle>
        </DialogHeader>
        <div data-slot="dialog-body" className="min-h-0 overflow-y-auto pb-2.5">
          <ProgramDetailBody
            program={program}
            extras={extras ?? 'ready'}
            channel={channel}
            dayLabel={dayLabel}
            onAir={onAir}
            onReserve={onReserve}
            reservation={
              booking &&
              (booking.standing === 'recording' ? (
                <div
                  data-booking="recording"
                  className="rounded-lg bg-coral-soft px-3.5 py-3"
                >
                  <div className="flex items-center gap-1.5 text-ui font-bold text-coral">
                    <RecordIcon className="size-4" />
                    {RECORDING_IN_PROGRESS_TERM.label}
                  </div>
                  {channel && (
                    <p className="mt-1 text-sub leading-relaxed text-ink-2">
                      <b>{CHANNEL_KIND_LABEL[channel.kind]}</b>のチューナー 1 本
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-mint-soft px-3.5 py-3">
                  <div className="flex items-center gap-1.5 text-ui font-bold text-mint">
                    <SuccessIcon className="size-4" />
                    確保済み
                  </div>
                  {channel && (
                    <p className="mt-1 text-sub leading-relaxed text-ink-2">
                      <b>{CHANNEL_KIND_LABEL[channel.kind]}</b>のチューナー 1 本
                    </p>
                  )}
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <ActionRow className="gap-2">
                      <Button
                        variant="change"
                        size="sm"
                        onClick={() => setEditing(true)}
                      >
                        <EditIcon />
                        予約を編集
                      </Button>
                      <Button
                        variant="halt"
                        size="sm"
                        disabled={pending}
                        onClick={drop}
                      >
                        <CloseIcon />
                        予約を取り消す
                      </Button>
                    </ActionRow>
                    {refusal && (
                      <span aria-live="polite" className="basis-full">
                        <InlineAlert tone="warn">{refusal}</InlineAlert>
                      </span>
                    )}
                  </div>
                  {editing && (
                    <EditReservationDialog
                      booking={{ ...booking, title: program.title }}
                      open
                      onOpenChange={setEditing}
                      onRevise={onRevise}
                    />
                  )}
                </div>
              ))
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
