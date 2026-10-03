'use client'

import type { Channel } from '@/repository/channels'
import type { Program } from '@/repository/programs'
import type { ReservationWrite } from '@/repository/reservations'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ProgramBookingActions } from '@/components/guide/program-booking'
import { ProgramBooking } from '@/components/guide/program-booking'
import { ProgramDetailBody } from '@/components/guide/program-detail'

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
} & ProgramBookingActions) {
  const booking = program.booking

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
              booking && (
                <ProgramBooking
                  booking={booking}
                  title={program.title}
                  channel={channel}
                  onCancel={onCancel}
                  onRevise={onRevise}
                />
              )
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
