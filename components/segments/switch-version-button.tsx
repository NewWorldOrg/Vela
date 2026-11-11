'use client'

import { useState, useTransition } from 'react'

import { switchRefusalOf, versionLabel } from '@/lib/segment-detection'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/vela/inline-alert'
import { Spinner } from '@/components/vela/spinner'
import type { ChooseSegmentVersion } from '@/components/segments/version-history'

export function SwitchVersionButton({
  number,
  onChoose,
}: {
  number: number
  onChoose: ChooseSegmentVersion
}) {
  const [asking, setAsking] = useState(false)
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()
  const label = versionLabel(number)

  const choose = () => {
    if (pending) {
      return
    }

    startTransition(async () => {
      setRefusal(undefined)

      const result = await onChoose(number)

      if (result.state === 'ok') {
        setAsking(false)

        return
      }

      setRefusal(switchRefusalOf(result.state))
    })
  }

  return (
    <AlertDialog
      open={asking}
      onOpenChange={(open) => {
        if (!open) {
          setRefusal(undefined)
        }

        setAsking(open)
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="tone"
          size="sm"
          aria-label={`${label}に切り替え`}
        >
          切り替え
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}に切り替えます</AlertDialogTitle>
          <AlertDialogDescription>
            {`録画の CM・OP・ED の位置を${label}で判定し直します。自動では切り替わらなくなります。`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <span aria-live="polite">
          {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
        </span>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            variant="default"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              choose()
            }}
          >
            {pending && <Spinner size="control" />}
            切り替える
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
