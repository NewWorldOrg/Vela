'use client'

import { cn } from '@/lib/utils'

const EVERY = 'すべて'

/** A row of pills that narrows a list to one of its values, `すべて` first: the chosen pill in the ink, the others on the surface. */
export function FilterChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly string[]
  value?: string
  onChange: (next: string | null) => void
}) {
  const pills = [
    { value: undefined, label: EVERY },
    ...options.map((one) => ({ value: one, label: one })),
  ]

  return (
    <div
      role="group"
      aria-label={label}
      data-slot="filter-chips"
      className="flex min-w-0 flex-wrap gap-2"
    >
      {pills.map((pill) => {
        const chosen = pill.value === value

        return (
          <button
            key={pill.label}
            type="button"
            aria-pressed={chosen}
            onClick={() => onChange(pill.value ?? null)}
            className={cn(
              'tap-target inline-flex h-8 cursor-pointer items-center rounded-full px-[calc(13rem/16)] text-ui font-medium whitespace-nowrap outline-none transition-[background-color,color,transform] duration-[140ms] ease-toy active:scale-[0.98] focus-visible:shadow-ring',
              chosen
                ? 'bg-btn text-on-ink'
                : 'bg-surface text-ink hover:bg-surface-2',
            )}
          >
            {pill.label}
          </button>
        )
      })}
    </div>
  )
}
