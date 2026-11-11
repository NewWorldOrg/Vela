'use client'

import { cn } from '@/lib/utils'
import type { ChannelKind } from '@/repository/channels'
import { ChannelKinds } from '@/components/live/channel-kinds'

/** The kinds of channel across the phone's width, under the picture while one is watched. */
export function PhoneKinds({
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
  return (
    <div
      data-slot="phone-kinds"
      className={cn('bg-bg px-4 py-2.5 empty:hidden', className)}
    >
      <ChannelKinds
        kind={kind}
        kinds={kinds}
        onKind={onKind}
        className="w-full [&>*]:flex-1"
      />
    </div>
  )
}
