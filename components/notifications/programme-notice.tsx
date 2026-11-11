'use client'

import { useId, useState, useTransition } from 'react'

import { cn } from '@/lib/utils'
import { signedOut } from '@/lib/signed-out'
import {
  leadChipWords,
  leadToastWords,
  toggled,
  type LeadMinutes,
  type NotificationWrite,
  type Noticing,
  type ProgrammeWatch,
  type WatchDraft,
  type WatchOffer,
  type WatchWrite,
} from '@/lib/notifications'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { InlineAlert } from '@/components/vela/banner'
import { BellIcon, BellOffIcon } from '@/components/vela/icons'
import { useToast } from '@/components/vela/toast'
import { LeadChoice } from '@/components/notifications/lead-choice'
import {
  NoticeDialogContent,
  NoticeDialogFooter,
  NoticeDialogHeader,
  NoticeGroupLabel,
} from '@/components/notifications/notice-dialog'
import { PickChip, PickChips } from '@/components/notifications/pick-chip'

export const NOTIFY_START = '放送開始を通知'

export const STOP_NOTIFYING = '通知を取り消す'

const SIGNED_OUT = signedOut('通知の設定')

function refusalOf(
  result: Exclude<NotificationWrite | WatchWrite, { state: 'ok' }>,
): string {
  return result.state === 'unauthenticated' ? SIGNED_OUT : result.message
}

/** Beside `録画予約` in a programme's detail: opens a small dialog that asks for a notice when the programme starts, without recording it, and once asked takes it back. The toast it leaves offers to take it back too. Nothing where there is neither a notice nor anywhere to send one. */
export function NotifyStartButton({
  programmeId,
  watch,
  noticing,
  className,
}: {
  programmeId: string
  watch?: ProgrammeWatch
  noticing: Noticing
  className?: string
}) {
  const [asking, setAsking] = useState(false)
  const [pending, startTransition] = useTransition()
  const say = useToast()

  const unwatch = (watchId: string) =>
    startTransition(async () => {
      const result = await noticing.onUnwatch(watchId)

      if (result.state !== 'ok') {
        say({ text: refusalOf(result) })
      }
    })

  const ask = async (draft: WatchDraft) => {
    const result = await noticing.onWatch(programmeId, draft)

    if (result.state === 'ok') {
      const asked = result.watch

      say({
        text: leadToastWords(asked.leadMinutes),
        action: { label: '取り消す', onPress: () => unwatch(asked.id) },
      })
    }

    return result
  }

  if (watch) {
    return (
      <Button
        variant="tone"
        disabled={pending}
        onClick={() => unwatch(watch.id)}
        className={className}
      >
        <BellOffIcon />
        {STOP_NOTIFYING}
      </Button>
    )
  }

  if (!noticing.offer) {
    return null
  }

  return (
    <>
      <Button
        variant="tone"
        disabled={pending}
        onClick={() => setAsking(true)}
        className={className}
      >
        <BellIcon />
        {NOTIFY_START}
      </Button>
      <Dialog open={asking} onOpenChange={setAsking}>
        <NoticeDialogContent className="data-[size=default]:sm:max-w-[calc(460rem/16)]">
          {asking && (
            <AskForm
              offer={noticing.offer}
              onAsk={ask}
              onClose={() => setAsking(false)}
            />
          )}
        </NoticeDialogContent>
      </Dialog>
    </>
  )
}

function AskForm({
  offer,
  onAsk,
  onClose,
}: {
  offer: WatchOffer
  onAsk: (draft: WatchDraft) => Promise<WatchWrite>
  onClose: () => void
}) {
  const id = useId()
  const [lead, setLead] = useState<LeadMinutes>(offer.leadMinutes)
  const [sendTo, setSendTo] = useState<string[]>(() =>
    offer.destinations.map((destination) => destination.id),
  )
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()

  const ask = () => {
    setRefusal(undefined)

    startTransition(async () => {
      const result = await onAsk({ leadMinutes: lead, destinations: sendTo })

      if (result.state === 'ok') {
        onClose()

        return
      }

      setRefusal(refusalOf(result))
    })
  }

  return (
    <>
      <NoticeDialogHeader
        title={NOTIFY_START}
        description="何分前に、どこへ通知するかを選びます。"
      />
      <div
        data-slot="dialog-body"
        className="-mx-1 flex min-h-0 flex-col gap-4 overflow-y-auto px-1 pb-1"
      >
        <div className="flex flex-col gap-1.5">
          <NoticeGroupLabel>何分前</NoticeGroupLabel>
          <LeadChoice
            value={lead}
            onValueChange={setLead}
            className="mt-1 w-fit max-w-full"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <NoticeGroupLabel id={`${id}-to`}>送り先</NoticeGroupLabel>
          <PickChips aria-labelledby={`${id}-to`} className="mt-1">
            {offer.destinations.map((destination) => (
              <PickChip
                key={destination.id}
                on={sendTo.includes(destination.id)}
                onPress={() => setSendTo(toggled(sendTo, destination.id))}
              >
                {destination.name}
              </PickChip>
            ))}
          </PickChips>
        </div>
        <span aria-live="polite" className="contents">
          {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
        </span>
      </div>
      <NoticeDialogFooter>
        <Button variant="tone" onClick={onClose}>
          キャンセル
        </Button>
        <Button disabled={pending || sendTo.length === 0} onClick={ask}>
          通知する
        </Button>
      </NoticeDialogFooter>
    </>
  )
}

/** The amber chip a programme wears beside its time once its start is to be told: how early. */
export function NotifyLeadChip({ leadMinutes }: { leadMinutes: LeadMinutes }) {
  return (
    <span
      data-slot="notify-lead-chip"
      className="inline-flex h-[calc(26rem/16)] items-center gap-[5px] rounded-full bg-warn-soft pr-2.5 pl-2 text-sub font-semibold whitespace-nowrap text-warn-text tabular-nums"
    >
      <BellIcon aria-hidden="true" className="size-[calc(13rem/16)]" />
      {leadChipWords(leadMinutes)}
    </span>
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
