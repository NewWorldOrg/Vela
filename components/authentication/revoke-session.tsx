'use client'

import { useState, useTransition } from 'react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'

import type { RevokeResult, SessionRow } from '@/repository/sessions'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/vela/banner'
import { CloseIcon } from '@/components/vela/icons'
import { METHOD_LABEL, revokedHref } from '@/components/authentication/wording'

/**
 * A destructive operation, so it says what is cut off and what is not before
 * it happens. Only another device is ever revoked here — the device reading
 * the page signs itself out instead.
 */
export function RevokeSession({
  session,
  onRevoke,
}: {
  session: SessionRow
  onRevoke: (id: string) => Promise<RevokeResult>
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [refusal, setRefusal] = useState<string>()

  const run = () =>
    startTransition(async () => {
      setRefusal(undefined)

      const result = await onRevoke(session.id)

      if (result.state === 'unavailable') {
        setRefusal(result.message)

        return
      }

      setOpen(false)
      router.replace(revokedHref(session.device.name) as Route)
    })

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          setRefusal(undefined)
          setOpen(true)
        }}
      >
        <CloseIcon />
        失効させる
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="sm:max-w-[520px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-[9px]">
              <CloseIcon className="size-[19px] text-coral" />
              このセッションを失効させます
            </AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              {session.device.name}のセッションを失効させます
            </AlertDialogDescription>
          </AlertDialogHeader>

          <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3.5 gap-y-1.5 text-ui max-[700px]:grid-cols-1">
            <dt className="text-sub text-ink-3">端末</dt>
            <dd className="min-w-0 break-words">
              {session.device.name}
              {session.device.kind && `(${session.device.kind})`}
            </dd>
            <dt className="text-sub text-ink-3">認証方式</dt>
            <dd>{METHOD_LABEL[session.method]}</dd>
            <dt className="text-sub text-ink-3">作成</dt>
            <dd className="font-code tabular-nums">{session.createdAt}</dd>
            <dt className="text-sub text-ink-3">最終利用</dt>
            <dd className="font-code tabular-nums">
              {session.lastUsed.at ?? session.lastUsed.label}
            </dd>
          </dl>

          <span aria-live="polite">
            {refusal && (
              <InlineAlert tone="danger">
                失効させられませんでした。{refusal}
              </InlineAlert>
            )}
          </span>

          <AlertDialogFooter>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              キャンセル
            </Button>
            <Button variant="destructive" disabled={pending} onClick={run}>
              <CloseIcon />
              失効させる
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
