'use client'

import { useId, useState, useTransition, type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { signedOut } from '@/lib/signed-out'
import {
  nameFits,
  readAddress,
  type BrowserPermission,
  type NotificationWrite,
} from '@/lib/notifications'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { InlineAlert } from '@/components/vela/banner'
import { Field } from '@/components/vela/field'
import {
  BellIcon,
  ChevronRightIcon,
  LinkIcon,
  PlusIcon,
} from '@/components/vela/icons'
import { pressable } from '@/components/vela/tactile'
import {
  NoticeDialogContent,
  NoticeDialogFooter,
  NoticeDialogHeader,
  NoticeLabel,
} from '@/components/notifications/notice-dialog'
import { WebhookField } from '@/components/notifications/webhook-field'

export interface WebhookDraft {
  name: string
  url: string
}

export interface BrowserDraft {
  name: string
}

export const ADD_DESTINATION = '送り先を追加'

const SIGNED_OUT = signedOut('追加')

export const DENIED_HERE =
  'このブラウザは通知を拒否しています。サイトの設定で許可してください'

type Step = 'pick' | 'webhook' | 'browser'

/** This browser as a destination: what a person calls it, whether it lets notices through, and what adds it. */
export interface BrowserChoice {
  here: string
  permission: BrowserPermission
  onAdd: (draft: BrowserDraft) => Promise<NotificationWrite>
}

/** `追加` and the dialog it opens: the form for a webhook, or, where this browser can be a destination too, the choice of kind first with a way back to it. */
export function AddDestinationDialog({
  browser,
  onAddWebhook,
}: {
  browser?: BrowserChoice
  onAddWebhook: (draft: WebhookDraft) => Promise<NotificationWrite>
}) {
  const first: Step = browser ? 'pick' : 'webhook'
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>(first)
  const back = browser ? () => setStep('pick') : undefined

  const openTo = (next: boolean) => {
    setOpen(next)

    if (next) {
      setStep(first)
    }
  }

  return (
    <Dialog open={open} onOpenChange={openTo}>
      <Button size="sm" onClick={() => openTo(true)}>
        <PlusIcon />
        追加
      </Button>
      <NoticeDialogContent>
        {step === 'pick' && browser && (
          <KindPicker here={browser.here} onPick={setStep} />
        )}
        {step === 'webhook' && (
          <WebhookForm
            onBack={back}
            onClose={() => setOpen(false)}
            onAdd={onAddWebhook}
          />
        )}
        {step === 'browser' && browser && (
          <BrowserForm
            here={browser.here}
            permission={browser.permission}
            onBack={back}
            onClose={() => setOpen(false)}
            onAdd={browser.onAdd}
          />
        )}
      </NoticeDialogContent>
    </Dialog>
  )
}

function KindPicker({
  here,
  onPick,
}: {
  here: string
  onPick: (step: Step) => void
}) {
  return (
    <>
      <NoticeDialogHeader
        title={ADD_DESTINATION}
        description="送り先の種類を選びます。"
      />
      <ul className="mt-0.5 rounded-lg bg-surface dark:bg-surface-2">
        <KindOption
          icon={<LinkIcon />}
          name="Webhook"
          says="Slack・Discord の URL に送ります"
          onPick={() => onPick('webhook')}
        />
        <KindOption
          icon={<BellIcon />}
          name="このブラウザ"
          says={`${here} に通知を出します`}
          onPick={() => onPick('browser')}
        />
      </ul>
    </>
  )
}

function KindOption({
  icon,
  name,
  says,
  onPick,
}: {
  icon: ReactNode
  name: string
  says: string
  onPick: () => void
}) {
  return (
    <li className="relative before:absolute before:top-0 before:right-0 before:left-[calc(62rem/16)] before:h-px before:bg-hair first:before:hidden first:[&>button]:rounded-t-lg last:[&>button]:rounded-b-lg">
      <button
        type="button"
        data-pressable-row
        onClick={onPick}
        className={cn(
          'flex min-h-16 w-full items-center gap-3.5 py-3.5 pr-3.5 pl-4 text-left outline-none',
          'transition-[background-color] duration-[140ms] ease-toy hover:bg-surface-2 focus-visible:shadow-ring dark:hover:bg-surface-3',
          pressable,
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-surface-2 text-ink dark:bg-surface-3 [&_svg]:size-[calc(18rem/16)]">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-title font-semibold text-ink">
            {name}
          </span>
          <span className="mt-0.5 block text-sub text-ink-2">{says}</span>
        </span>
        <ChevronRightIcon className="text-ink-3" />
      </button>
    </li>
  )
}

function useAdding(onClose: () => void) {
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()

  const add = (write: () => Promise<NotificationWrite>) => {
    setRefusal(undefined)

    startTransition(async () => {
      const result = await write()

      if (result.state === 'ok') {
        onClose()

        return
      }

      setRefusal(
        result.state === 'unauthenticated' ? SIGNED_OUT : result.message,
      )
    })
  }

  return { refusal, pending, add }
}

function WebhookForm({
  onBack,
  onClose,
  onAdd,
}: {
  onBack?: () => void
  onClose: () => void
  onAdd: (draft: WebhookDraft) => Promise<NotificationWrite>
}) {
  const id = useId()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const { refusal, pending, add } = useAdding(onClose)
  const { kind } = readAddress(url)
  const ready = kind !== undefined && nameFits(name) && !pending

  return (
    <>
      <NoticeDialogHeader
        title={ADD_DESTINATION}
        description="Slack か Discord の Webhook を送り先に足します。"
        onBack={onBack}
      />
      <div className="flex flex-col gap-4">
        <Field>
          <NoticeLabel htmlFor={`${id}-name`}>名前</NoticeLabel>
          <Input
            id={`${id}-name`}
            value={name}
            maxLength={64}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <WebhookField
          id={`${id}-url`}
          value={url}
          onChange={setUrl}
          hint="保存したあとは末尾だけが見えます"
        />
        <span aria-live="polite" className="contents">
          {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
        </span>
      </div>
      <NoticeDialogFooter>
        <Button variant="tone" onClick={onClose}>
          キャンセル
        </Button>
        <Button
          disabled={!ready}
          onClick={() =>
            add(() => onAdd({ name: name.trim(), url: url.trim() }))
          }
        >
          追加
        </Button>
      </NoticeDialogFooter>
    </>
  )
}

function BrowserForm({
  here,
  permission,
  onBack,
  onClose,
  onAdd,
}: {
  here: string
  permission: BrowserPermission
  onBack?: () => void
  onClose: () => void
  onAdd: (draft: BrowserDraft) => Promise<NotificationWrite>
}) {
  const id = useId()
  const [name, setName] = useState(here)
  const { refusal, pending, add } = useAdding(onClose)
  const denied = permission === 'denied'

  return (
    <>
      <NoticeDialogHeader
        title={ADD_DESTINATION}
        description="このブラウザを送り先に足します。"
        onBack={onBack}
      />
      <div className="flex flex-col gap-4">
        <Field>
          <NoticeLabel htmlFor={`${id}-name`}>名前</NoticeLabel>
          <Input
            id={`${id}-name`}
            value={name}
            maxLength={64}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <span aria-live="polite" className="contents">
          {denied && <InlineAlert tone="danger">{DENIED_HERE}</InlineAlert>}
          {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
        </span>
      </div>
      <NoticeDialogFooter>
        <Button variant="tone" onClick={onClose}>
          キャンセル
        </Button>
        <Button
          disabled={denied || !nameFits(name) || pending}
          onClick={() => add(() => onAdd({ name: name.trim() }))}
        >
          許可して追加
        </Button>
      </NoticeDialogFooter>
    </>
  )
}
