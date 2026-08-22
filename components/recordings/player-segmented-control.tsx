'use client'

import { cn } from '@/lib/utils'

/** The pill switch used on the dark player chrome (quality, audio, latency). */
export function PlayerSegmentedControl({
  label,
  options,
  value,
  onChange,
  numeric,
}: {
  label: string
  options: string[]
  value: string
  onChange: (next: string) => void
  numeric?: boolean
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex gap-1 rounded-full border border-white/20 p-0.5"
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          onClick={() => onChange(option)}
          className={cn(
            'tap-target cursor-pointer rounded-full border-none bg-transparent px-[11px] py-[3px] text-[11.5px] font-medium whitespace-nowrap text-(--pl-ink-2) transition-[background-color,color] duration-150 hover:text-(--pl-ink) focus-visible:shadow-ring focus-visible:outline-none',
            numeric && 'font-code',
            option === value &&
              'bg-[rgba(150,187,180,.24)] font-bold text-[#C0D8D3]',
          )}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
