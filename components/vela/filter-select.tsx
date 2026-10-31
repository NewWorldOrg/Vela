'use client'

import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { BAND_CONTROL } from '@/components/vela/band'
import { ChoiceLabel } from '@/components/vela/segmented-control'

const ALL = '__all__'

const EVERY = 'すべて'

export function FilterSelect({
  label,
  value,
  options,
  onChange,
  quiet = false,
}: {
  label: string
  value?: string
  options: { value: string; label: string }[]
  onChange: (next: string | null) => void
  /** Its name and choice written on the page's ground, `期間 すべて`, where the band has no surface of its own. */
  quiet?: boolean
}) {
  const current = value
    ? (options.find((o) => o.value === value)?.label ?? value)
    : EVERY

  if (quiet) {
    return (
      <Select
        value={value ?? ALL}
        onValueChange={(next) => onChange(next === ALL ? null : next)}
      >
        <SelectTrigger
          size="sm"
          aria-label={label}
          className={cn(
            BAND_CONTROL,
            'w-fit gap-1 rounded-full bg-transparent pr-2 pl-2.5 text-ink-2 enabled:hover:bg-surface [&_svg]:size-3.5',
          )}
        >
          <span aria-hidden="true">{label}</span>
          <b className="font-semibold text-ink">{current}</b>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{EVERY}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div className="inline-flex min-w-0 items-center gap-2">
      <ChoiceLabel aria-hidden="true">{label}</ChoiceLabel>
      <Select
        value={value ?? ALL}
        onValueChange={(next) => onChange(next === ALL ? null : next)}
      >
        <SelectTrigger
          size="sm"
          aria-label={label}
          className={cn(BAND_CONTROL, 'w-fit rounded-full font-medium')}
        >
          {current}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{EVERY}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
