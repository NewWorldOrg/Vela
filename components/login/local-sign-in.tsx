'use client'

import { useId, useState, type FormEvent } from 'react'

import { formatClock } from '@/lib/format'
import { signIn, type SignInResult } from '@/repository/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InlineAlert } from '@/components/vela/banner'
import { Field, FieldLabel } from '@/components/vela/field'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  SignInIcon,
} from '@/components/vela/icons'

export type LocalSignInPlacement = 'lead' | 'expanded' | 'collapsed'

export type SignInNotice =
  | { kind: 'refused' }
  | { kind: 'rate-limited'; retryAt: number }
  | { kind: 'unavailable' }

export function SignInNoticeAlert({ notice }: { notice: SignInNotice }) {
  if (notice.kind === 'rate-limited') {
    return (
      <InlineAlert tone="warn" className="text-balance">
        サインインの試行が多すぎます。{formatClock(notice.retryAt)}{' '}
        以降にもう一度お試しください。
      </InlineAlert>
    )
  }

  if (notice.kind === 'unavailable') {
    return (
      <InlineAlert tone="warn" className="text-balance">
        サインインの要求が届きませんでした。時間をおいてもう一度お試しください。
      </InlineAlert>
    )
  }

  return (
    <InlineAlert tone="danger" className="text-balance">
      サインインに失敗しました。もう一度お試しください。
    </InlineAlert>
  )
}

export function LocalSignIn({
  returnPath,
  placement,
}: {
  returnPath: string
  placement: LocalSignInPlacement
}) {
  const [open, setOpen] = useState<boolean>(placement === 'expanded')
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

  const lead: boolean = placement === 'lead'

  const form = (
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
      {lead ? (
        <Button
          type="submit"
          size="lg"
          className="mt-0.5 w-full gap-[9px] text-[13.5px]"
          disabled={busy}
        >
          <SignInIcon className="size-4" />
          {busy ? 'サインインしています' : 'サインイン'}
        </Button>
      ) : (
        <Button type="submit" variant="outline" disabled={busy}>
          {busy ? 'サインインしています' : 'サインイン'}
        </Button>
      )}
    </form>
  )

  if (lead) {
    return <div className="text-left">{form}</div>
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
          {form}
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
