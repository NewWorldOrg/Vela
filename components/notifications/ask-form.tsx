'use client'

import { useId, useState, useTransition } from 'react'

import {
  toggled,
  type LeadMinutes,
  type WatchDraft,
  type WatchOffer,
  type WatchWrite,
} from '@/lib/notifications'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/vela/banner'
import { LeadChoice } from '@/components/notifications/lead-choice'
import {
  NoticeDialogFooter,
  NoticeDialogHeader,
  NoticeGroupLabel,
} from '@/components/notifications/notice-dialog'
import { PickChip, PickChips } from '@/components/notifications/pick-chip'
import {
  refusalOf,
  NOTIFY_START,
} from '@/components/notifications/programme-notice'

export function AskForm({
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
