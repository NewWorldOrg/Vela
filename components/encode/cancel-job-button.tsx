'use client'

import { useState, useTransition } from 'react'

import { asksBeforeCallingOff } from '@/lib/encode'
import type { EncodeJob, EncodeWrite } from '@/repository/encode'
import { RECORDING_REMOVED_LABEL } from '@/repository/encode-terms'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/vela/banner'
import { Spinner } from '@/components/vela/progress'

const SIGNED_OUT = 'サインインが切れているため、中止できませんでした。'

export function CancelJobButton({
  job,
  onCallOff,
}: {
  job: Pick<EncodeJob, 'id' | 'title' | 'status'>
  onCallOff: (id: string) => Promise<EncodeWrite>
}) {
  const [pending, startTransition] = useTransition()
  const [refusal, setRefusal] = useState<string>()
  const [asking, setAsking] = useState(false)
  const asks = asksBeforeCallingOff(job.status)

  const callOff = () => {
    if (pending) {
      return
    }

    startTransition(async () => {
      setRefusal(undefined)

      const result = await onCallOff(job.id)

      if (result.state === 'ok') {
        setAsking(false)

        return
      }

      setRefusal(
        result.state === 'unauthenticated' ? SIGNED_OUT : result.message,
      )
    })
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        aria-disabled={pending}
        onClick={asks ? () => setAsking(true) : callOff}
      >
        {pending && !asks && <Spinner className="size-3.5" />}
        中止
      </Button>
      {refusal && !asks && (
        <span role="status" className="text-note text-coral">
          {refusal}
        </span>
      )}
      {asks && (
        <AlertDialog
          open={asking}
          onOpenChange={(open) => {
            if (!open) {
              setRefusal(undefined)
            }

            setAsking(open)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>このエンコードを中止します</AlertDialogTitle>
              <AlertDialogDescription>
                <b className="font-bold text-ink">
                  {job.title ?? RECORDING_REMOVED_LABEL}
                </b>{' '}
                のエンコードを途中で止めます。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <span aria-live="polite">
              {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
            </span>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>
                キャンセル
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={pending}
                onClick={(event) => {
                  event.preventDefault()
                  callOff()
                }}
              >
                {pending && <Spinner className="size-3.5" />}
                中止する
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </span>
  )
}
