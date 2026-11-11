'use client'

import { useId, useState, useTransition } from 'react'

import { signedOut } from '@/lib/signed-out'
import {
  EVENT_GROUPS,
  nameFits,
  toggled,
  type NotificationDestination,
  type NotificationEvent,
  type NotificationRuleSet,
  type NotificationWrite,
  type RuleSetDraft,
} from '@/lib/notifications'
import { useTellingOfTheGone } from '@/hooks/useTellingOfTheGone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { InlineAlert } from '@/components/vela/banner'
import { Field } from '@/components/vela/field'
import {
  NoticeDialogFooter,
  NoticeDialogHeader,
  NoticeGroupLabel,
  NoticeLabel,
} from '@/components/notifications/notice-dialog'
import { PickChip, PickChips } from '@/components/notifications/pick-chip'
import { RemoveButton } from '@/components/notifications/remove-button'

const SIGNED_OUT = signedOut('保存')

const FRESH: RuleSetDraft = {
  name: '',
  enabled: true,
  events: [],
  destinations: [],
}

export function RuleSetForm({
  ruleSet,
  destinations,
  onClose,
  onSave,
  onRemove,
}: {
  ruleSet?: NotificationRuleSet
  destinations: Pick<NotificationDestination, 'id' | 'name'>[]
  onClose: () => void
  onSave: (draft: RuleSetDraft) => Promise<NotificationWrite>
  onRemove?: () => Promise<NotificationWrite>
}) {
  const id = useId()
  const from = ruleSet ?? FRESH
  const [name, setName] = useState(from.name)
  const [enabled, setEnabled] = useState(from.enabled)
  const [events, setEvents] = useState<NotificationEvent[]>(from.events)
  const [sendTo, setSendTo] = useState<string[]>(from.destinations)
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()
  const tellOfTheGone = useTellingOfTheGone()
  const ready = nameFits(name) && sendTo.length > 0 && !pending
  const title = ruleSet ? 'ルールセットを変更' : 'ルールセットを追加'

  const save = () => {
    setRefusal(undefined)

    startTransition(async () => {
      const result = await onSave({
        name: name.trim(),
        enabled,
        events,
        destinations: sendTo,
      })

      if (result.state === 'ok') {
        onClose()

        return
      }

      tellOfTheGone(result)
      setRefusal(
        result.state === 'unauthenticated' ? SIGNED_OUT : result.message,
      )
    })
  }

  return (
    <>
      <NoticeDialogHeader
        title={title}
        description="ルールセットの名前と出来事と送り先を決めます。"
      />
      <div
        data-slot="dialog-body"
        className="-mx-1 flex min-h-0 flex-col gap-4 overflow-y-auto px-1 pb-1"
      >
        <Field>
          <NoticeLabel htmlFor={`${id}-name`}>名前</NoticeLabel>
          <Input
            id={`${id}-name`}
            value={name}
            maxLength={64}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <div className="flex items-center gap-3 text-body text-ink">
          <label htmlFor={`${id}-enabled`}>有効</label>
          <Switch
            id={`${id}-enabled`}
            checked={enabled}
            onCheckedChange={setEnabled}
            className="ml-auto"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <NoticeGroupLabel id={`${id}-events`}>出来事</NoticeGroupLabel>
          <div
            role="group"
            aria-labelledby={`${id}-events`}
            className="mt-1 flex flex-col gap-2"
          >
            {EVENT_GROUPS.map((group) => (
              <div
                key={group.name}
                className="grid grid-cols-[calc(84rem/16)_minmax(0,1fr)] items-center gap-3 upright:grid-cols-1 upright:gap-1.5"
              >
                <span
                  id={`${id}-${group.name}`}
                  className="text-[calc(13rem/16)] font-semibold text-ink-2"
                >
                  {group.name}
                </span>
                <PickChips aria-labelledby={`${id}-${group.name}`}>
                  {group.events.map(({ event, label }) => (
                    <PickChip
                      key={event}
                      on={events.includes(event)}
                      onPress={() => setEvents(toggled(events, event))}
                    >
                      {label}
                    </PickChip>
                  ))}
                </PickChips>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <NoticeGroupLabel id={`${id}-to`}>送り先</NoticeGroupLabel>
          <PickChips aria-labelledby={`${id}-to`} className="mt-1">
            {destinations.map((destination) => (
              <PickChip
                key={destination.id}
                on={sendTo.includes(destination.id)}
                onPress={() => setSendTo(toggled(sendTo, destination.id))}
              >
                {destination.name}
              </PickChip>
            ))}
          </PickChips>
        </div>
        <span aria-live="polite" className="contents">
          {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
        </span>
      </div>
      <NoticeDialogFooter>
        {ruleSet && onRemove && (
          <RemoveButton
            what="ルールセット"
            name={ruleSet.name}
            onRemove={onRemove}
            onRemoved={onClose}
          />
        )}
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
