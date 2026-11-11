'use client'

import { type NotificationDestination } from '@/lib/notifications'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'

const EVERY = '__every__'

export const EVERY_DESTINATION = 'すべての送り先'

/** Which destination's deliveries the log shows: all of them, or one. */
export function DeliveryFilter({
  destinations,
  value,
  onChange,
}: {
  destinations: Pick<NotificationDestination, 'id' | 'name'>[]
  value?: string
  onChange: (id: string | undefined) => void
}) {
  const current =
    destinations.find(({ id }) => id === value)?.name ?? EVERY_DESTINATION

  return (
    <Select
      value={value ?? EVERY}
      onValueChange={(next) => onChange(next === EVERY ? undefined : next)}
    >
      <SelectTrigger
        size="sm"
        aria-label="送り先"
        className="tap-target h-[calc(34rem/16)] w-fit gap-1 rounded-full bg-surface pr-3 pl-3.5 text-ui font-semibold text-ink transition-[background-color,transform] duration-[140ms] ease-toy enabled:hover:bg-surface-2 enabled:active:scale-[0.98] [&_svg]:size-3.5"
      >
        {current}
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={EVERY}>{EVERY_DESTINATION}</SelectItem>
        {destinations.map(({ id, name }) => (
          <SelectItem key={id} value={id}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
