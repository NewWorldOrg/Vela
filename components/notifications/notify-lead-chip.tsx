'use client'

import { leadChipWords, type LeadMinutes } from '@/lib/notifications'
import { BellIcon } from '@/components/vela/icons'

export function NotifyLeadChip({ leadMinutes }: { leadMinutes: LeadMinutes }) {
  return (
    <span
      data-slot="notify-lead-chip"
      className="inline-flex h-[calc(26rem/16)] items-center gap-[5px] rounded-full bg-warn-soft pr-2.5 pl-2 text-sub font-semibold whitespace-nowrap text-warn-text tabular-nums"
    >
      <BellIcon aria-hidden="true" className="size-[calc(13rem/16)]" />
      {leadChipWords(leadMinutes)}
    </span>
  )
}
