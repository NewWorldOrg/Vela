'use client'

import { useState, useTransition } from 'react'

import { signedOut } from '@/lib/signed-out'
import type { CandidateTuning, WriteResult } from '@/repository/services'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { InlineAlert } from '@/components/vela/banner'
import {
  TuningFields,
  useTuningEntry,
} from '@/components/channels/tuning-fields'

export function AddCandidateDialog({
  serviceKey,
  serviceName,
  open,
  onOpenChange,
  onAdd,
}: {
  serviceKey: string
  serviceName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (serviceKey: string, tuning: CandidateTuning) => Promise<WriteResult>
}) {
  const hold = useTuningEntry()
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()

  const close = (next: boolean) => {
    if (!next) {
      hold.reset()
      setRefusal(undefined)
    }

    onOpenChange(next)
  }

  const submit = () => {
    const tuning = hold.read()

    if (!tuning) {
      return
    }

    setRefusal(undefined)

    startTransition(async () => {
      const result = await onAdd(serviceKey, tuning)

      if (result.state === 'ok') {
        close(false)

        return
      }

      setRefusal(
        result.state === 'unauthenticated' ? signedOut('追加') : result.message,
      )
    })
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>候補チャンネルを手動追加</DialogTitle>
          <DialogDescription>
            {serviceName} に候補チャンネルを追加します。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <TuningFields id="candidate" hold={hold} />

          <span aria-live="polite">
            {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
          </span>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)}>
            キャンセル
          </Button>
          <Button disabled={pending} onClick={submit}>
            追加する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
