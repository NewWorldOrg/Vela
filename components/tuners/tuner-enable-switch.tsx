'use client'

import { useState, useTransition } from 'react'

import type { TunerToggleResult } from '@/repository/tuners'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'

interface Outcome {
  failed: boolean
  text: string
}

function toOutcome(
  deviceId: string,
  enabled: boolean,
  result: TunerToggleResult,
): Outcome {
  const asked = `${deviceId} を${enabled ? '有効' : '無効'}に`

  switch (result.state) {
    case 'ok':
      return { failed: false, text: `${asked}しました` }
    case 'unauthenticated':
      return {
        failed: true,
        text: `${asked}できませんでした。サインインしてから開き直してください。`,
      }
    case 'unavailable':
      return {
        failed: true,
        text: `${asked}できませんでした。${result.message}`,
      }
  }
}

/**
 * The saved state is what the switch shows. While a disable is draining the
 * tuner is already off in the ledger, so the switch reads off and the row says
 * the stop happens once the session releases it.
 */
export function TunerEnableSwitch({
  deviceId,
  checked,
  onToggle,
}: {
  deviceId: string
  checked: boolean
  onToggle: (deviceId: string, enabled: boolean) => Promise<TunerToggleResult>
}) {
  const [pending, startTransition] = useTransition()
  const [outcome, setOutcome] = useState<Outcome>()

  return (
    <>
      <Switch
        size="sm"
        checked={checked}
        aria-disabled={pending}
        aria-label={`${deviceId} を有効にする`}
        className="aria-disabled:cursor-not-allowed aria-disabled:opacity-45"
        onCheckedChange={(next) => {
          if (pending) {
            return
          }

          setOutcome(undefined)

          startTransition(async () => {
            setOutcome(
              toOutcome(deviceId, next, await onToggle(deviceId, next)),
            )
          })
        }}
      />
      <span
        aria-live="polite"
        className={cn(
          'block text-[11px] leading-[1.5]',
          outcome?.failed
            ? 'mt-1 max-w-[180px] whitespace-normal text-coral'
            : 'sr-only',
        )}
      >
        {outcome?.text}
      </span>
    </>
  )
}
