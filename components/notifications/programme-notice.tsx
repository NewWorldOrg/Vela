'use client'

import { useState, useTransition } from 'react'

import { cn } from '@/lib/utils'
import { signedOut } from '@/lib/signed-out'
import {
  leadChipWords,
  leadToastWords,
  type LeadMinutes,
  type NotificationWrite,
  type ProgrammeWatch,
} from '@/lib/notifications'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { BellIcon, BellOffIcon, ChevronDownIcon } from '@/components/vela/icons'
import { pressable } from '@/components/vela/tactile'
import { useToast } from '@/components/vela/toast'
import { LeadChoice } from '@/components/notifications/lead-choice'

export type WatchWrite =
  | { state: 'ok'; watch: ProgrammeWatch }
  | { state: 'unauthenticated' }
  | { state: 'rejected'; message: string }

export const NOTIFY_START = '放送開始を通知'

export const STOP_NOTIFYING = '通知を取り消す'

const SIGNED_OUT = signedOut('通知の設定')

function refusalOf(
  result: Exclude<NotificationWrite | WatchWrite, { state: 'ok' }>,
): string {
  return result.state === 'unauthenticated' ? SIGNED_OUT : result.message
}

/** Beside `録画予約` in a programme's detail: asks for a notice when the programme starts, without recording it, and once asked takes it back. The toast it leaves offers to take it back too. */
export function NotifyStartButton({
  watch,
  onWatch,
  onUnwatch,
  className,
}: {
  watch?: ProgrammeWatch
  onWatch: () => Promise<WatchWrite>
  onUnwatch: () => Promise<NotificationWrite>
  className?: string
}) {
  const [pending, startTransition] = useTransition()
  const say = useToast()

  const unwatch = () =>
    startTransition(async () => {
      const result = await onUnwatch()

      if (result.state !== 'ok') {
        say({ text: refusalOf(result) })
      }
    })

  const ask = () =>
    startTransition(async () => {
      const result = await onWatch()

      if (result.state !== 'ok') {
        say({ text: refusalOf(result) })

        return
      }

      say({
        text: leadToastWords(result.watch.leadMinutes),
        action: { label: '取り消す', onPress: () => void onUnwatch() },
      })
    })

  if (watch) {
    return (
      <Button
        variant="tone"
        disabled={pending}
        onClick={unwatch}
        className={className}
      >
        <BellOffIcon />
        {STOP_NOTIFYING}
      </Button>
    )
  }

  return (
    <Button
      variant="tone"
      disabled={pending}
      onClick={ask}
      className={className}
    >
      <BellIcon />
      {NOTIFY_START}
    </Button>
  )
}

/** The amber chip a programme wears once its start is to be told, beside its time; pressing it picks how early. */
export function NotifyLeadChip({
  leadMinutes,
  onChangeLead,
  defaultOpen,
}: {
  leadMinutes: LeadMinutes
  onChangeLead: (lead: LeadMinutes) => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-slot="notify-lead-chip"
        className={cn(
          'tap-target inline-flex h-[calc(26rem/16)] items-center gap-[5px] rounded-full bg-warn-soft pr-2.5 pl-2 text-sub font-semibold whitespace-nowrap text-warn-text outline-none tabular-nums',
          'transition-[box-shadow,transform] duration-[140ms] ease-toy active:scale-[0.98] focus-visible:shadow-ring',
          'data-[state=open]:shadow-[0_0_0_2px_var(--bg),0_0_0_3.5px_var(--accent)]',
          pressable,
        )}
      >
        <BellIcon className="size-[calc(13rem/16)]" />
        {leadChipWords(leadMinutes)}
        <ChevronDownIcon className="-ml-0.5 size-3 opacity-80" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={16}
        aria-label="何分前に通知するか"
        className="w-auto p-1.5"
      >
        <LeadChoice
          value={leadMinutes}
          onValueChange={(lead) => {
            onChangeLead(lead)
            setOpen(false)
          }}
          className="bg-transparent p-0"
        />
      </PopoverContent>
    </Popover>
  )
}

/** The bell a programme is marked with where its start is to be told and it is not recorded: amber like a reservation, told apart by its shape. */
export function NotifyBell({
  className,
  label,
}: {
  className?: string
  /** Read out in place of the mark where nothing beside it says the same. */
  label?: string
}) {
  return (
    <span
      data-slot="notify-bell"
      className={cn(
        'inline-flex size-4 shrink-0 items-center justify-center text-warn',
        className,
      )}
    >
      <BellIcon aria-hidden="true" className="size-3.5 [stroke-width:1.9]" />
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}
