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
  /** A condition chip, `期間 すべて`, for a band with no surface of its own: the chip's own ground, and the accent's tint while it narrows the list. */
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
            'w-fit gap-1 rounded-full bg-surface pr-2.5 pl-3 text-ink transition-[background-color,color,transform] duration-[140ms] ease-toy enabled:hover:bg-surface-2 enabled:active:scale-[0.98] [&_svg]:size-3.5',
            value &&
              'bg-accent-tint text-acc-text enabled:hover:bg-accent-tint',
          )}
        >
          <span aria-hidden="true">{label}</span>
          <b className="font-semibold">{current}</b>
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
