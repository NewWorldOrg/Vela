'use client'

import { useState, useTransition } from 'react'

import { signedOut } from '@/lib/signed-out'
import { RECORDING_IN_PROGRESS_TERM } from '@/lib/state-terms'
import type { Channel } from '@/repository/channels'
import { CHANNEL_KIND_LABEL } from '@/repository/channels'
import type { ProgramBooking as Booking } from '@/repository/programs'
import type {
  ReservationRevision,
  ReservationWrite,
} from '@/repository/reservations'
import { Button } from '@/components/ui/button'
import {
  CloseIcon,
  EditIcon,
  RecordIcon,
  SuccessIcon,
} from '@/components/vela/icons'
import { ActionRow } from '@/components/vela/action-row'
import { InlineAlert } from '@/components/vela/banner'
import { EditReservationDialog } from '@/components/reservations/edit-reservation-dialog'
import { useTellDisplaced } from '@/components/guide/reservation-area'

const SIGNED_OUT = signedOut('操作')

export interface ProgramBookingActions {
  onCancel: (id: string) => Promise<ReservationWrite>
  onRevise: (
    id: string,
    revision: ReservationRevision,
  ) => Promise<ReservationWrite>
}

export function ProgramBooking({
  booking,
  title,
  channel,
  onCancel,
  onRevise,
}: {
  booking: Booking
  title: string
  channel?: Channel
} & ProgramBookingActions) {
  const [pending, startTransition] = useTransition()
  const [refusal, setRefusal] = useState<string>()
  const tellDisplaced = useTellDisplaced()
  const [editing, setEditing] = useState(false)

  const drop = () => {
    startTransition(async () => {
      setRefusal(undefined)
      tellDisplaced(undefined)

      const result = await onCancel(booking.id)

      setRefusal(
        result.state === 'unauthenticated'
          ? SIGNED_OUT
          : result.state === 'rejected'
            ? result.message
            : undefined,
      )
      tellDisplaced(result.state === 'ok' ? result.displaced : undefined)
    })
  }

  const revise = async (id: string, revision: ReservationRevision) => {
    tellDisplaced(undefined)

    const result = await onRevise(id, revision)

    if (result.state === 'ok') {
      setRefusal(undefined)
      tellDisplaced(result.displaced)
    }

    return result
  }

  if (booking.standing === 'recording') {
    return (
      <div
        data-booking="recording"
        className="rounded-lg bg-coral-soft px-3.5 py-3"
      >
        <div className="flex items-center gap-1.5 text-ui font-bold text-coral">
          <RecordIcon className="size-4" />
          {RECORDING_IN_PROGRESS_TERM.label}
        </div>
        <TunerTaken channel={channel} />
      </div>
    )
  }

  return (
    <div
      data-booking="scheduled"
      className="rounded-lg bg-mint-soft px-3.5 py-3"
    >
      <div className="flex items-center gap-1.5 text-ui font-bold text-mint">
        <SuccessIcon className="size-4" />
        確保済み
      </div>
      <TunerTaken channel={channel} />
      <div className="mt-2.5 flex flex-wrap gap-2">
        <ActionRow>
          <Button variant="change" size="sm" onClick={() => setEditing(true)}>
            <EditIcon />
            予約を編集
          </Button>
          <Button variant="halt" size="sm" disabled={pending} onClick={drop}>
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
          booking={{ ...booking, title }}
          open
          onOpenChange={setEditing}
          onRevise={revise}
        />
      )}
    </div>
  )
}

function TunerTaken({ channel }: { channel?: Channel }) {
  if (!channel) {
    return null
  }

  return (
    <p className="mt-1 text-sub leading-relaxed text-ink-2">
      <b>{CHANNEL_KIND_LABEL[channel.kind]}</b>のチューナー 1 本
    </p>
  )
}
