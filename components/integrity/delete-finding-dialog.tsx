'use client'

import { useState, useTransition } from 'react'

import type { FindingDiscarded, IntegrityFinding } from '@/repository/integrity'
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
import { InlineAlert } from '@/components/vela/banner'
import { TrashIcon, WarningIcon } from '@/components/vela/icons'

const SIGNED_OUT = 'サインインが切れているため、操作できませんでした。'

export function DeleteFindingDialog({
  finding,
  onOpenChange,
  onDelete,
}: {
  finding: IntegrityFinding | null
  onOpenChange: (open: boolean) => void
  onDelete: (findingId: string) => Promise<FindingDiscarded>
}) {
  const [pending, startTransition] = useTransition()
  const [refusal, setRefusal] = useState<string>()

  const remove = (): void => {
    if (!finding) {
      return
    }

    startTransition(async () => {
      const result = await onDelete(finding.id)

      if (result.state === 'ok') {
        setRefusal(undefined)
        onOpenChange(false)

        return
      }

      setRefusal(
        result.state === 'unauthenticated' ? SIGNED_OUT : result.message,
      )
    })
  }

  return (
    <AlertDialog
      open={finding !== null}
      onOpenChange={(open) => {
        if (!open) {
          setRefusal(undefined)
        }

        onOpenChange(open)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>このファイルを削除します</AlertDialogTitle>
          {finding && (
            <AlertDialogDescription asChild>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-left text-ui">
                <dt className="text-ink-3">ファイル</dt>
                <dd className="font-code break-all text-ink">{finding.path}</dd>
                <dt className="text-ink-3">保存先</dt>
                <dd className="font-code text-ink-2">{finding.root}</dd>
                <dt className="text-ink-3">サイズ</dt>
                <dd className="font-code text-ink-2">{finding.size}</dd>
                <dt className="text-ink-3">検出</dt>
                <dd className="font-code text-ink-2">{finding.noticedAt}</dd>
              </dl>
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <p className="flex items-center gap-2 rounded-md bg-coral-soft px-3.5 py-2.5 text-ui font-medium text-coral">
          <WarningIcon className="size-4 shrink-0" />
          元に戻せません。
        </p>
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
            <TrashIcon />
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
