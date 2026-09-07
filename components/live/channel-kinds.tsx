'use client'

import { cn } from '@/lib/utils'
import type { ChannelKind } from '@/repository/channels'
import { CHANNEL_KIND_ORDER, CHANNEL_KIND_TAB } from '@/repository/channels'
import { pressable } from '@/components/vela/tactile'

export function ChannelKinds({
  kind,
  kinds,
  onKind,
  className,
}: {
  kind: ChannelKind
  kinds: ChannelKind[]
  onKind: (kind: ChannelKind) => void
  className?: string
}) {
  const offered = CHANNEL_KIND_ORDER.filter((one) => kinds.includes(one))

  if (offered.length < 2) {
    return null
  }

  return (
    <div
      role="group"
      aria-label="放送の種別"
      className={cn('flex min-w-0 flex-wrap gap-1.5', className)}
    >
      {offered.map((one) => (
        <button
          key={one}
          type="button"
          aria-pressed={one === kind}
          onClick={() => onKind(one)}
          className={cn(
            'tap-target rounded-full border border-edge bg-transparent px-[15px] py-[5px] text-ui font-medium whitespace-nowrap text-ink-2 outline-none',
            'transition-[background-color,color,translate] duration-150 ease-toy hover:bg-surface hover:text-ink hover:-translate-x-px hover:-translate-y-px focus-visible:shadow-ring',
            one === kind && 'border-brand bg-brand-soft font-bold text-brand',
            pressable,
          )}
        >
          {CHANNEL_KIND_TAB[one]}
        </button>
      ))}
    </div>
  )
}
