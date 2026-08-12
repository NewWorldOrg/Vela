'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'

const NONE = '__none__'

export function ConditionSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value?: string
  options: { value: string; label: string }[]
  onChange: (next: string | null) => void
}) {
  const current = value
    ? options.find((o) => o.value === value)?.label
    : undefined

  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => onChange(v === NONE ? null : v)}
    >
      <SelectTrigger
        size="sm"
        className="w-fit rounded-full shadow-pop transition-[translate,box-shadow] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px hover:shadow-pop-lg"
      >
        {current ?? label}
      </SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value="__none__">{label}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
