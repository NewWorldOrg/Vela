'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'

const ALL = '__all__'

export function LibraryFilterSelect({
  prefix,
  value,
  options,
  onChange,
}: {
  prefix: string
  value?: string
  options: { value: string; label: string }[]
  onChange: (next: string | null) => void
}) {
  const current = value
    ? (options.find((o) => o.value === value)?.label ?? value)
    : 'すべて'

  return (
    <Select
      value={value ?? ALL}
      onValueChange={(next) => onChange(next === ALL ? null : next)}
    >
      <SelectTrigger
        size="sm"
        className="w-fit rounded-full shadow-pop transition-[translate,box-shadow] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px hover:shadow-pop-lg"
      >
        {prefix}: {current}
      </SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value={ALL}>{prefix}: すべて</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
