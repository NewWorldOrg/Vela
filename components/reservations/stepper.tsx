'use client'

import { wholeNumber } from '@/lib/reservations'
import { cn } from '@/lib/utils'
import { MinusIcon, PlusIcon } from '@/components/vela/icons'

/** A whole number between a least and a most, typed or stepped with the − and + on either side of it. */
export function Stepper({
  id,
  value,
  onChange,
  range,
  step,
  invalid,
  describedBy,
  className,
}: {
  id: string
  value: string
  onChange: (next: string) => void
  range: { least: number; most: number }
  step: number
  invalid: boolean
  describedBy?: string
  className?: string
}) {
  const read = wholeNumber(value)
  const by = (delta: number) => {
    const from = read ?? range.least
    const next = Math.min(range.most, Math.max(range.least, from + delta))

    onChange(String(next))
  }

  return (
    <span
      data-slot="stepper"
      className={cn(
        'inline-flex h-9 w-fit items-center gap-0.5 rounded-full bg-surface-2 px-1',
        invalid && 'shadow-[inset_0_0_0_1.5px_var(--accent)]',
        className,
      )}
    >
      <button
        type="button"
        aria-label={`${step} 減らす`}
        tabIndex={-1}
        disabled={read !== undefined && read <= range.least}
        onClick={() => by(-step)}
        className="tap-target grid size-7 cursor-pointer place-items-center rounded-full text-ink-2 transition-colors duration-[140ms] ease-toy enabled:hover:bg-raised enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-3.5"
      >
        <MinusIcon />
      </button>
      <input
        id={id}
        inputMode="numeric"
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        className="-my-1 h-11 w-16 rounded-md bg-transparent text-center font-code text-ui font-semibold text-ink tabular-nums outline-none focus-visible:shadow-ring"
      />
      <button
        type="button"
        aria-label={`${step} 増やす`}
        tabIndex={-1}
        disabled={read !== undefined && read >= range.most}
        onClick={() => by(step)}
        className="tap-target grid size-7 cursor-pointer place-items-center rounded-full text-ink-2 transition-colors duration-[140ms] ease-toy enabled:hover:bg-raised enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-3.5"
      >
        <PlusIcon />
      </button>
    </span>
  )
}
