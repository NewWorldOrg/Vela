'use client'

import { useId, useState, useTransition } from 'react'

import { cn } from '@/lib/utils'
import { signedOut } from '@/lib/signed-out'
import {
  toggled,
  type LeadMinutes,
  type NotificationDestination,
  type NotificationWrite,
  type ProgrammeWatch,
} from '@/lib/notifications'
import { Badge } from '@/components/ui/badge'
import { IconButton } from '@/components/vela/icon-button'
import { CloseIcon } from '@/components/vela/icons'
import { useToast } from '@/components/vela/toast'
import { ROW_GROUND, RowTimes } from '@/components/reservations/reservation-row'
import { LeadChoice } from '@/components/notifications/lead-choice'
import { PickChip, PickChips } from '@/components/notifications/pick-chip'
import { NotifyBell } from '@/components/notifications/programme-notice'
import { NoticeGroupLabel } from '@/components/notifications/notice-dialog'

/** A single notice as the reservation list shows it: the programme it is for, and when and where to. */
export interface WatchedProgramme extends ProgrammeWatch {
  title: string
  channelName: string
  startAt: string
  endAt: string
}

export interface WatchActions {
  onChangeLead: (id: string, lead: LeadMinutes) => Promise<NotificationWrite>
  onChangeDestinations: (
    id: string,
    destinationIds: string[],
  ) => Promise<NotificationWrite>
  onCancel: (id: string) => Promise<NotificationWrite>
}

export const NOTIFY_ONLY = '通知'

const FROM_THE_GUIDE = '手動'

const SIGNED_OUT = signedOut('変更')

/** The row's grid: the times, the bell and the title over where it came from, then the chip and the ×. Narrower times on a phone. */
const ROW_GRID =
  'grid min-h-[calc(62rem/16)] grid-cols-[calc(76rem/16)_minmax(0,1fr)_auto] items-center gap-x-5 px-2.5 py-2 upright:grid-cols-[calc(50rem/16)_minmax(0,1fr)_auto] upright:gap-x-2 upright:pr-1.5 upright:pl-2.5'

const ROW_LINE =
  "relative before:absolute before:top-0 before:right-2.5 before:left-[calc(116rem/16)] before:border-t before:border-hair before:content-[''] first:before:hidden data-open:before:opacity-0 [&[data-open]+li]:before:opacity-0 upright:before:left-[calc(70rem/16)]"

/** A notice that a programme starts, standing among the reservations: a bell where a reservation has its genre's dot, and `通知` where it has its state. Pressing the title opens how early and where to under it. */
export function NotifyOnlyRow({
  watch,
  destinations,
  open,
  onToggle,
  actions,
}: {
  watch: WatchedProgramme
  destinations: Pick<NotificationDestination, 'id' | 'name'>[]
  open: boolean
  onToggle: () => void
  actions: WatchActions
}) {
  const panel = useId()
  const [lead, setLead] = useState(watch.leadMinutes)
  const [sendTo, setSendTo] = useState(watch.destinationIds)
  const [pending, startTransition] = useTransition()
  const say = useToast()

  const refused = (result: NotificationWrite) => {
    if (result.state === 'ok') {
      return false
    }

    say({
      text: result.state === 'unauthenticated' ? SIGNED_OUT : result.message,
    })

    return true
  }

  const changeLead = async (next: LeadMinutes) => {
    const was = lead

    setLead(next)

    if (refused(await actions.onChangeLead(watch.id, next))) {
      setLead(was)
    }
  }

  const changeSendTo = async (destinationId: string) => {
    const was = sendTo
    const next = toggled(sendTo, destinationId)

    setSendTo(next)

    if (refused(await actions.onChangeDestinations(watch.id, next))) {
      setSendTo(was)
    }
  }

  return (
    <li
      data-watch={watch.id}
      data-open={open ? '' : undefined}
      className={ROW_LINE}
    >
      <div
        className={cn(
          'relative',
          ROW_GRID,
          ROW_GROUND,
          open && 'rounded-b-none bg-surface',
        )}
      >
        <RowTimes
          span={{ startAt: watch.startAt, endAt: watch.endAt }}
          whenLabel=""
        />
        <span className="min-w-0">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={open ? panel : undefined}
            onClick={onToggle}
            className="flex w-full min-w-0 cursor-pointer items-center gap-2 text-left text-title font-semibold tracking-[-0.008em] text-ink outline-none after:absolute after:inset-0 after:z-[1] after:rounded-md after:content-[''] focus-visible:after:shadow-ring upright:gap-[calc(7rem/16)]"
          >
            <NotifyBell />
            <span className="min-w-0 truncate">{watch.title}</span>
          </button>
          <span className="mt-0.5 block truncate text-sub text-ink-2">
            {`${watch.channelName} · ${FROM_THE_GUIDE}`}
          </span>
        </span>
        <span className="relative z-[2] flex items-center justify-end gap-2">
          <Badge variant="info">{NOTIFY_ONLY}</Badge>
          <IconButton
            variant="quiet"
            aria-label={`${watch.title} の通知を取り消す`}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                refused(await actions.onCancel(watch.id))
              })
            }
            className="text-ink-3"
          >
            <CloseIcon />
          </IconButton>
        </span>
      </div>
      {open && (
        <div
          id={panel}
          className="flex flex-col gap-3 rounded-b-md bg-surface pt-1 pr-4 pb-4 pl-[calc(116rem/16)] upright:pr-3 upright:pb-3.5 upright:pl-[calc(70rem/16)]"
        >
          <div className="flex flex-col gap-1.5">
            <NoticeGroupLabel className="text-note">何分前</NoticeGroupLabel>
            <LeadChoice
              value={lead}
              onValueChange={(next) => void changeLead(next)}
              className="w-fit bg-bg [&>button]:h-7 gap-x-0 [&>button]:px-2 [&>button]:text-sub"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <NoticeGroupLabel id={`${panel}-to`} className="text-note">
              送り先
            </NoticeGroupLabel>
            <PickChips
              aria-labelledby={`${panel}-to`}
              className="gap-x-1.5 gap-y-2.5"
            >
              {destinations.map((destination) => (
                <PickChip
                  key={destination.id}
                  on={sendTo.includes(destination.id)}
                  disabled={sendTo.length === 1 && sendTo[0] === destination.id}
                  onPress={() => void changeSendTo(destination.id)}
                  className={cn(
                    'pr-3 pl-2.5 text-[calc(13rem/16)]',
                    !sendTo.includes(destination.id) &&
                      'bg-bg enabled:hover:bg-surface-2 dark:bg-bg dark:enabled:hover:bg-surface-2',
                  )}
                >
                  {destination.name}
                </PickChip>
              ))}
            </PickChips>
          </div>
        </div>
      )}
    </li>
  )
}
