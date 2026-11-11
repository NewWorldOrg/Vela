'use client'

import { useState, useTransition } from 'react'

import {
  leadToastWords,
  type Noticing,
  type ProgrammeWatch,
  type WatchDraft,
} from '@/lib/notifications'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { BellIcon, BellOffIcon } from '@/components/vela/icons'
import { useToast } from '@/components/vela/toasts'
import { NoticeDialogContent } from '@/components/notifications/notice-dialog-content'
import {
  refusalOf,
  STOP_NOTIFYING,
  NOTIFY_START,
} from '@/components/notifications/wording'
import { AskForm } from '@/components/notifications/ask-form'

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
