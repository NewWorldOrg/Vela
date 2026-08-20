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
import { Input } from '@/components/ui/input'
import { InlineAlert } from '@/components/vela/banner'
import { Field, FieldHint, FieldLabel } from '@/components/vela/field'
import { LockIcon, WarningIcon } from '@/components/vela/icons'
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
            <AlertDialogDescription>
              {username
                ? `ユーザー名 ${username} のパスワードを変更します。`
                : 'ローカルアカウントは起動時に一度だけ自動で作られ、無効にはできません。'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-3.5">
            <Field>
              <FieldLabel htmlFor={currentId}>いまのパスワード</FieldLabel>
              <Input
                id={currentId}
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                disabled={pending}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={newId}>新しいパスワード</FieldLabel>
              <Input
                id={newId}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                disabled={pending}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <FieldHint>
                外部プレイヤーにも同じアカウントを設定しているときは、変更後に入れ直してください
              </FieldHint>
            </Field>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg bg-coral-soft px-3.5 py-[11px] text-ui leading-[1.7] text-coral">
            <WarningIcon className="mt-[3px] size-[17px] shrink-0" />
            <div>
              変更すると、自分の現在のセッション以外が全て失効します。ほかの端末は次のリクエストから
              401 になり、もう一度サインインが必要になります。
            </div>
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
