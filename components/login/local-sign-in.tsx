'use client'

import { useId, useState, type FormEvent } from 'react'

import { formatClock } from '@/lib/format'
import { signIn, type SignInResult } from '@/repository/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InlineAlert } from '@/components/vela/banner'
import { Field, FieldLabel } from '@/components/vela/field'
import { ChevronDownIcon, ChevronUpIcon } from '@/components/vela/icons'

export type SignInNotice =
  | { kind: 'refused' }
  | { kind: 'rate-limited'; retryAt: number }
  | { kind: 'unavailable' }

export function SignInNoticeAlert({ notice }: { notice: SignInNotice }) {
  if (notice.kind === 'rate-limited') {
    return (
      <InlineAlert tone="warn">
        試行が多すぎます。{formatClock(notice.retryAt)}{' '}
        以降にもう一度お試しください
      </InlineAlert>
    )
  }

  if (notice.kind === 'unavailable') {
    return (
      <InlineAlert tone="warn">
        サインインを受け付ける口に接続できませんでした。時間をおいてもう一度お試しください
      </InlineAlert>
    )
  }

  return (
    <InlineAlert tone="danger">
      サインインに失敗しました。もう一度お試しください
    </InlineAlert>
  )
}

export function LocalSignIn({
  returnPath,
  defaultOpen,
}: {
  returnPath: string
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState<boolean>(defaultOpen)
  const [busy, setBusy] = useState<boolean>(false)
  const [notice, setNotice] = useState<SignInNotice | null>(null)
  const panelId: string = useId()
  const usernameId: string = useId()
  const passwordId: string = useId()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const entered = new FormData(event.currentTarget)

    setBusy(true)
    setNotice(null)

    const result: SignInResult = await signIn({
      username: String(entered.get('username') ?? ''),
      password: String(entered.get('password') ?? ''),
    })

    if (result.state === 'signed-in') {
      window.location.assign(returnPath)

      return
    }

    setBusy(false)
    setNotice(noticeOf(result))
  }

  return (
    <div className="mt-[18px] border-t border-dashed border-line-strong pt-[18px]">
      <div className="flex justify-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
        >
          ローカルアカウントでサインイン
          {open ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </Button>
      </div>
      {open && (
        <div id={panelId} className="mt-3.5 text-left">
          <p className="mb-3 text-note leading-[1.7] text-ink-3">
            ID
            プロバイダを通せない外部プレイヤーのために残しているアカウントです
          </p>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <Field>
              <FieldLabel htmlFor={usernameId}>ユーザー名</FieldLabel>
              <Input
                id={usernameId}
                name="username"
                autoComplete="username"
                required
                disabled={busy}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={passwordId}>パスワード</FieldLabel>
              <Input
                id={passwordId}
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={busy}
              />
            </Field>
            {notice && <SignInNoticeAlert notice={notice} />}
            <Button type="submit" variant="outline" disabled={busy}>
              {busy ? 'サインインしています' : 'サインイン'}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}

function noticeOf(result: SignInResult): SignInNotice {
  if (result.state === 'rate-limited') {
    return {
      kind: 'rate-limited',
      retryAt: Date.now() + result.retryAfterSeconds * 1000,
    }
  }

  return result.state === 'refused'
    ? { kind: 'refused' }
    : { kind: 'unavailable' }
}
