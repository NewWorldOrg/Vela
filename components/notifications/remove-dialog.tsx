'use client'

import { useState, useTransition } from 'react'

import { signedOut } from '@/lib/signed-out'
import type { NotificationWrite } from '@/lib/notifications'
import { useTellingOfTheGone } from '@/hooks/useTellingOfTheGone'
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
import { InlineAlert } from '@/components/vela/inline-alert'
import { TrashIcon } from '@/components/vela/icons'
import { Spinner } from '@/components/vela/spinner'

const SIGNED_OUT = signedOut('削除')

/** The question asked before anything goes: the name of what goes, what goes with it, and that it cannot come back. */
export function RemoveDialog({
  what,
  name,
  also,
  open,
  onOpenChange,
  onRemove,
  onRemoved,
}: {
  what: '送り先' | 'ルールセット'
  name: string
  also?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRemove: () => Promise<NotificationWrite>
  onRemoved?: () => void
}) {
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()
  const tellOfTheGone = useTellingOfTheGone()

  const remove = () =>
    startTransition(async () => {
      setRefusal(undefined)

      const result = await onRemove()

      if (result.state === 'ok') {
        onOpenChange(false)
        onRemoved?.()

        return
      }

      tellOfTheGone(result)
      setRefusal(
        result.state === 'unauthenticated' ? SIGNED_OUT : result.message,
      )
    })

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setRefusal(undefined)
        onOpenChange(next)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>この{what}を削除します</AlertDialogTitle>
          <AlertDialogDescription>
            <b className="block font-bold text-ink">{name}</b>
            {also && <span className="block">{also}</span>}
            元に戻せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <span aria-live="polite">
          {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
        </span>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            variant="danger"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              remove()
            }}
          >
            {pending ? <Spinner size="control" /> : <TrashIcon />}
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
