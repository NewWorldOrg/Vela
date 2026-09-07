'use client'

import { useState, useTransition } from 'react'

import type { EncodeRemoval } from '@/repository/encode'
import type { EncodeRemoved } from '@/repository/encode-terms'
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

const SIGNED_OUT = 'サインインが切れているため、撤去できませんでした。'

export function RemoveDefinitionButton({
  kind,
  label,
  onRemove,
  onRemoved,
}: {
  kind: 'プロファイル' | '保存先'
  label: string
  onRemove: () => Promise<EncodeRemoval>
  onRemoved: (removal: EncodeRemoved) => void
}) {
  const [open, setOpen] = useState(false)
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()

  const remove = () =>
    startTransition(async () => {
      setRefusal(undefined)

      const result = await onRemove()

      if (result.state === 'ok') {
        setOpen(false)
        onRemoved(result.removal)

        return
      }

      setRefusal(
        result.state === 'unauthenticated' ? SIGNED_OUT : result.message,
      )
    })

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        aria-label={`${label} を撤去`}
        onClick={() => {
          setRefusal(undefined)
          setOpen(true)
        }}
      >
        <TrashIcon />
        撤去
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>この{kind}を撤去します</AlertDialogTitle>
            <AlertDialogDescription>
              <b className="font-bold text-ink">{label}</b>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <span aria-live="polite">
            {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
          </span>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault()
                remove()
              }}
            >
              {pending ? <Spinner className="size-3.5" /> : <TrashIcon />}
              撤去する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
