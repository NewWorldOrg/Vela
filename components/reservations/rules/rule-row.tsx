'use client'

import { useState, useTransition } from 'react'

import { cn } from '@/lib/utils'
import type { Rule, RuleWrite } from '@/repository/rules'
import { Switch } from '@/components/ui/switch'
import { InlineAlert } from '@/components/vela/inline-alert'
import { SIGNED_OUT } from '@/components/reservations/rules/signed-out'

export function RuleRow({
  rule,
  selected,
  summary,
  ahead,
  onOpen,
  onSwitch,
}: {
  rule: Rule
  selected: boolean
  summary: string
  ahead?: number
  onOpen: () => void
  onSwitch: (enabled: boolean) => Promise<RuleWrite<number>>
}) {
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()

  return (
    <li
      data-selected={selected ? '' : undefined}
      className="relative before:absolute before:top-0 before:right-2.5 before:left-2.5 before:h-px before:bg-hair before:content-[''] first:before:hidden has-[>div:hover]:before:opacity-0 data-selected:before:opacity-0 [&:has(>div:hover)+li]:before:opacity-0 [&[data-selected]+li]:before:opacity-0"
    >
      <div
        className={cn(
          'relative flex items-center gap-4 rounded-md px-2.5 py-2.5 transition-[background-color] duration-[140ms] ease-toy hover:bg-surface',
          selected && 'bg-surface',
        )}
      >
        <button
          type="button"
          onClick={onOpen}
          aria-current={selected ? 'true' : undefined}
          className="min-w-0 flex-1 cursor-pointer text-left outline-none after:absolute after:inset-0 after:rounded-md after:content-[''] focus-visible:after:shadow-ring"
        >
          <b className="block text-title font-semibold tracking-[-0.008em] text-ink">
            {rule.name}
          </b>
          <span className="mt-0.5 block text-sub text-ink-2">{summary}</span>
          {ahead !== undefined && (
            <span className="mt-1 block text-sub text-ink-2">
              今後 <span className="font-code">{ahead}</span> 件
            </span>
          )}
        </button>
        <Switch
          checked={rule.enabled}
          disabled={pending}
          aria-label={`${rule.name} を有効にする`}
          className="relative z-[1]"
          onCheckedChange={(next) =>
            startTransition(async () => {
              const result = await onSwitch(next)

              setRefusal(
                result.state === 'ok'
                  ? undefined
                  : result.state === 'unauthenticated'
                    ? SIGNED_OUT
                    : result.message,
              )
            })
          }
        />
      </div>
      <span aria-live="polite">
        {refusal && (
          <InlineAlert tone="warn" className="mx-2.5 mb-2">
            {refusal}
          </InlineAlert>
        )}
      </span>
    </li>
  )
}
