'use client'

import { useTransition } from 'react'

import { Switch } from '@/components/ui/switch'

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
  onToggle: (deviceId: string, enabled: boolean) => Promise<void>
}) {
  const [pending, startTransition] = useTransition()

  return (
    <Switch
      size="sm"
      checked={checked}
      disabled={pending}
      aria-label={`${deviceId} を有効にする`}
      onCheckedChange={(next) =>
        startTransition(async () => {
          await onToggle(deviceId, next)
        })
      }
    />
  )
}
