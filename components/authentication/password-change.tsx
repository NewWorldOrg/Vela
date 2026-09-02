'use client'

import { useId, useState, useTransition } from 'react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'

import type { PasswordChange, PasswordResult } from '@/repository/sessions'
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
import { Field, FieldLabel } from '@/components/vela/field'
import { LockIcon } from '@/components/vela/icons'
import { PasswordInput } from '@/components/vela/password-input'
import { passwordChangedHref } from '@/components/authentication/wording'

/**
 * The one way to end every other session at once, which is why it sits with
 * the band that says so rather than beside a session of its own.
 */
export function ChangePassword({
  username,
  onChangePassword,
}: {
  /** Known only while the session in hand is a local one. */
  username?: string
  onChangePassword: (change: PasswordChange) => Promise<PasswordResult>
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [refusal, setRefusal] = useState<string>()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const currentId = useId()
  const newId = useId()

  const close = () => {
    setOpen(false)
    setCurrentPassword('')
    setNewPassword('')
  }

  const run = () =>
    startTransition(async () => {
      setRefusal(undefined)

      const result = await onChangePassword({ currentPassword, newPassword })

      if (result.state === 'refused') {
        setRefusal(result.message)

        return
      }

      close()
      router.replace(passwordChangedHref(result.sessionsEnded) as Route)
    })

  const ready = currentPassword.length > 0 && newPassword.length > 0

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setRefusal(undefined)
          setOpen(true)
        }}
      >
        <LockIcon />
        パスワードを変更
      </Button>

      <AlertDialog
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
      >
        <AlertDialogContent className="sm:max-w-[520px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-[9px]">
              <LockIcon className="size-[19px] text-coral" />
              ローカルアカウントのパスワードを変更します
            </AlertDialogTitle>
            {username && (
              <AlertDialogDescription>
                ユーザー名 {username} のパスワードを変更します。
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>

          <div className="flex flex-col gap-3.5">
            <Field>
              <FieldLabel htmlFor={currentId}>いまのパスワード</FieldLabel>
              <PasswordInput
                id={currentId}
                autoComplete="current-password"
                value={currentPassword}
                disabled={pending}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={newId}>新しいパスワード</FieldLabel>
              <PasswordInput
                id={newId}
                autoComplete="new-password"
                value={newPassword}
                disabled={pending}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </Field>
          </div>

          <span aria-live="polite">
            {refusal && (
              <InlineAlert tone="danger">
                変更できませんでした。{refusal}
              </InlineAlert>
            )}
          </span>

          <AlertDialogFooter>
            <Button variant="ghost" disabled={pending} onClick={close}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !ready}
              onClick={run}
            >
              <LockIcon />
              変更してほかの端末を失効させる
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
