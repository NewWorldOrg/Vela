'use client'

import { cn } from '@/lib/utils'
import { pressable, still } from '@/components/vela/tactile'

/**
 * The pill switch used on the dark player chrome (quality, audio, latency).
 *
 * A switch the API takes no argument for is drawn switched off rather than
 * left pressable: a control that moves its own pill and changes nothing behind
 * it is the worst of the three states it could be in. `value` may be unset,
 * which is what a switch that cannot say which option is in force looks like.
 */
export function PlayerSegmentedControl({
  label,
  options,
  value,
  onChange,
  numeric,
  off,
  title,
}: {
  label: string
  options: readonly string[]
  value?: string
  onChange: (next: string) => void
  numeric?: boolean
  /** Switched off, because nothing behind it would answer. */
  off?: boolean
  title?: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex gap-1 rounded-full border border-white/20 p-0.5',
        off && 'border-white/12',
      )}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          disabled={off}
          title={title}
          aria-pressed={off ? undefined : option === value}
          onClick={() => onChange(option)}
          className={cn(
            'tap-target rounded-full border-none bg-transparent px-[11px] py-[3px] text-[11.5px] font-medium whitespace-nowrap text-(--pl-ink-2) transition-[background-color,color] duration-150 hover:text-(--pl-ink) focus-visible:shadow-ring focus-visible:outline-none disabled:text-(--pl-ink-3) disabled:hover:text-(--pl-ink-3)',
            pressable,
            still,
            numeric && 'font-code',
            !off &&
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
