import { Fragment, type ReactNode } from 'react'

import type { SearchHit } from '@/repository/search'

export function marked(text: string, words: readonly string[]): ReactNode {
  const asked = words.filter((word) => word.length > 0)

  if (asked.length === 0) {
    return text
  }

  const pattern = new RegExp(
    `(${asked.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi',
  )

  return text.split(pattern).map((part, nth) =>
    nth % 2 === 1 ? (
      <mark
        key={nth}
        className="rounded-xs bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] px-0.5 text-inherit"
      >
        {part}
      </mark>
    ) : (
      <Fragment key={nth}>{part}</Fragment>
    ),
  )
}

export function hitsByDay(
  hits: readonly SearchHit[],
): { day: string; near?: string; hits: SearchHit[] }[] {
  return hits.reduce<{ day: string; near?: string; hits: SearchHit[] }[]>(
    (sorted, hit) => {
      const same = sorted.find((one) => one.day === hit.dayLabel)

      if (same) {
        same.hits.push(hit)
      } else {
        sorted.push({ day: hit.dayLabel, near: hit.dayNear, hits: [hit] })
      }

      return sorted
    },
    [],
  )
}
