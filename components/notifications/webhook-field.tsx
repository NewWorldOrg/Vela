'use client'

import { useState, type ReactNode } from 'react'

import { readAddress, registeringAs } from '@/lib/notifications'
import { Input } from '@/components/ui/input'
import { InlineAlert } from '@/components/vela/inline-alert'
import { Field, FieldHint } from '@/components/vela/field'
import { CheckIcon } from '@/components/vela/icons'
import { NoticeLabel } from '@/components/notifications/notice-dialog-content'

export const REFUSED_ADDRESS = 'この URL は受け付けられません'

/** A webhook's address, saying under it as it is typed which service it is for, and once the field is left whether it would be refused. */
export function WebhookField({
  id,
  value,
  onChange,
  placeholder,
  hint,
}: {
  id: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
  hint: ReactNode
}) {
  const [typing, setTyping] = useState(false)
  const { kind, refused } = readAddress(value)
  const saysRefused = refused && !typing
  const alertId = `${id}-refused`

  return (
    <Field>
      <NoticeLabel htmlFor={id}>Webhook の URL</NoticeLabel>
      <Input
        id={id}
        type="url"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        value={value}
        placeholder={placeholder}
        aria-invalid={saysRefused || undefined}
        aria-describedby={saysRefused ? alertId : undefined}
        onFocus={() => setTyping(true)}
        onBlur={() => setTyping(false)}
        onChange={(event) => onChange(event.target.value)}
        className="tabular-nums"
      />
      <span aria-live="polite" className="contents">
        {kind && (
          <span className="flex items-center gap-1.5 text-sub font-semibold text-acc-text">
            <CheckIcon className="size-3.5 [stroke-width:2.2]" />
            {registeringAs(kind)}
          </span>
        )}
        {saysRefused && (
          <InlineAlert id={alertId} tone="danger">
            {REFUSED_ADDRESS}
          </InlineAlert>
        )}
      </span>
      <FieldHint className="tabular-nums">{hint}</FieldHint>
    </Field>
  )
}
