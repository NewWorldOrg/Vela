'use client'

import { type Handover, type HandoverChoice } from '@/lib/external-player'
import { HandoverMenu } from '@/components/recordings/handover-menu'

const NOTHING_TO_CHOOSE: HandoverChoice[] = []

export function OpenExternally({
  handover,
  tone,
  wide,
  className,
}: {
  handover: Handover
  tone?: 'page' | 'player'
  wide?: boolean
  className?: string
}) {
  return (
    <HandoverMenu
      choices={NOTHING_TO_CHOOSE}
      only={handover}
      tone={tone}
      wide={wide}
      className={className}
    />
  )
}
