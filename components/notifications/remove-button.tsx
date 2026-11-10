'use client'

import { useState, useTransition } from 'react'

import { signedOut } from '@/lib/signed-out'
import type { NotificationWrite } from '@/lib/notifications'
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
import { TrashIcon } from '@/components/vela/icons'
import { Spinner } from '@/components/vela/progress'

const SIGNED_OUT = signedOut('削除')

/** The question asked before anything goes: the name of what goes, and that it cannot come back. */
export function RemoveDialog({
  what,
  name,
  open,
  onOpenChange,
  onRemove,
  onRemoved,
}: {
  what: '送り先' | 'ルールセット'
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRemove: () => Promise<NotificationWrite>
  onRemoved?: () => void
}) {
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()

  const remove = () =>
    startTransition(async () => {
      setRefusal(undefined)

      const result = await onRemove()

      if (result.state === 'ok') {
        onOpenChange(false)
        onRemoved?.()

        return
      }

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

/** `削除` with its question, where it stands as a button of its own. */
export function RemoveButton({
  what,
  name,
  onRemove,
  onRemoved,
}: {
  what: '送り先' | 'ルールセット'
  name: string
  onRemove: () => Promise<NotificationWrite>
  onRemoved?: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="danger"
        aria-label={`${name} を削除`}
        onClick={() => setOpen(true)}
      >
        削除
      </Button>
      <RemoveDialog
        what={what}
        name={name}
        open={open}
        onOpenChange={setOpen}
        onRemove={onRemove}
        onRemoved={onRemoved}
      />
    </>
  )
}
