'use client'

import { cn } from '@/lib/utils'
import { BAND_CONTROL, BAND_PRESS } from '@/components/vela/band'

export function SubChannelToggle({
  shown,
  onShownChange,
}: {
  shown: boolean
  onShownChange: (shown: boolean) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={shown}
      onClick={() => onShownChange(!shown)}
      className={cn(
        BAND_PRESS,
        BAND_CONTROL,
        shown && 'border-brand bg-brand-soft font-bold text-brand',
      )}
    >
      副チャンネル
    </button>
  )
}
