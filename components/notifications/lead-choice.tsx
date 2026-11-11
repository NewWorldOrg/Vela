'use client'

import { cn } from '@/lib/utils'
import { LEADS, isLead, leadLabel, type LeadMinutes } from '@/lib/notifications'
import { SegmentedControl } from '@/components/vela/segmented-control'

const OPTIONS = LEADS.map((lead) => ({
  value: String(lead),
  label: leadLabel(lead),
}))

/** How long before a programme starts its notice is sent: at the start, or one, three, five or ten minutes before. */
export function LeadChoice({
  value,
  onValueChange,
  disabled,
  className,
  'aria-label': ariaLabel = '何分前',
}: {
  value: LeadMinutes
  onValueChange: (lead: LeadMinutes) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
}) {
  return (
    <SegmentedControl
      aria-label={ariaLabel}
      options={OPTIONS}
      value={String(value)}
      disabled={disabled}
      onValueChange={(next) => {
        const lead = Number(next)

        if (isLead(lead)) {
          onValueChange(lead)
        }
      }}
      className={cn('tabular-nums', className)}
    />
  )
}
