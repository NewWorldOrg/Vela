'use client'

import type { ChannelKind } from '@/repository/channels'
import { CHANNEL_KIND_LABEL, CHANNEL_KIND_ORDER } from '@/repository/channels'
import { SegmentedControl } from '@/components/vela/segmented-control'

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
    <SegmentedControl
      aria-label="放送の種別"
      options={offered.map((one) => ({
        value: one,
        label: CHANNEL_KIND_LABEL[one],
      }))}
      value={kind}
      onValueChange={(next) =>
        onKind(offered.find((one) => one === next) ?? kind)
      }
      className={className}
    />
  )
}
