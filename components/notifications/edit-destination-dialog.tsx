'use client'

import { useId, useState, useTransition } from 'react'

import { signedOut } from '@/lib/signed-out'
import {
  KIND_LABEL,
  nameFits,
  readAddress,
  tailOf,
  type NotificationDestination,
  type NotificationWrite,
} from '@/lib/notifications'
import { wordFor } from '@/lib/not-yet-in-this-build'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { InlineAlert } from '@/components/vela/banner'
import { Field } from '@/components/vela/field'
import {
  NoticeDialogContent,
  NoticeDialogFooter,
  NoticeDialogHeader,
  NoticeLabel,
} from '@/components/notifications/notice-dialog'
import { WebhookField } from '@/components/notifications/webhook-field'

/** What changing a destination sends: its name, whether it is on, and a new address only when one was typed. */
export interface DestinationRevision {
  name: string
  enabled: boolean
  url?: string
}

const SIGNED_OUT = signedOut('変更')

export function EditDestinationDialog({
  destination,
  open,
  onOpenChange,
  onRevise,
}: {
  destination: NotificationDestination
  open: boolean
  onOpenChange: (open: boolean) => void
  onRevise: (
    id: string,
    revision: DestinationRevision,
  ) => Promise<NotificationWrite>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <NoticeDialogContent>
        {open && (
          <EditDestinationForm
            destination={destination}
            onClose={() => onOpenChange(false)}
            onRevise={onRevise}
          />
        )}
      </NoticeDialogContent>
    </Dialog>
  )
}

function EditDestinationForm({
  destination,
  onClose,
  onRevise,
}: {
  destination: NotificationDestination
  onClose: () => void
  onRevise: (
    id: string,
    revision: DestinationRevision,
  ) => Promise<NotificationWrite>
}) {
  const id = useId()
  const [name, setName] = useState(destination.name)
  const [url, setUrl] = useState('')
  const [enabled, setEnabled] = useState(destination.enabled)
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()
  const webhook = destination.kind !== 'webPush'
  const { refused } = readAddress(url)
  const ready = nameFits(name) && !refused && !pending

  const save = () => {
    setRefusal(undefined)

    startTransition(async () => {
      const typed = url.trim()
      const result = await onRevise(destination.id, {
        name: name.trim(),
        enabled,
        ...(typed === '' ? {} : { url: typed }),
      })

      if (result.state === 'ok') {
        onClose()

        return
      }

      setRefusal(
        result.state === 'unauthenticated' ? SIGNED_OUT : result.message,
      )
    })
  }

  return (
    <>
      <NoticeDialogHeader
        title="送り先を変更"
        description="送り先の名前と URL と有効を変えます。"
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
        {webhook && (
          <WebhookField
            id={`${id}-url`}
            value={url}
            onChange={setUrl}
            placeholder="変えないときは空のまま"
            hint={[
              wordFor(KIND_LABEL, destination.kind),
              destination.tail && `末尾 ${tailOf(destination.tail)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        )}
        <div className="flex items-center gap-3 text-body text-ink">
          <label htmlFor={`${id}-enabled`}>有効</label>
          <Switch
            id={`${id}-enabled`}
            checked={enabled}
            onCheckedChange={setEnabled}
            className="ml-auto"
          />
        </div>
        <span aria-live="polite" className="contents">
          {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
        </span>
      </div>
      <NoticeDialogFooter>
        <Button variant="tone" onClick={onClose}>
          キャンセル
        </Button>
        <Button disabled={!ready} onClick={save}>
          保存
        </Button>
      </NoticeDialogFooter>
    </>
  )
}
