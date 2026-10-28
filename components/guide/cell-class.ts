import type { BookingMark } from '@/lib/guide'
import { cn } from '@/lib/utils'
import type { Program } from '@/repository/programs'
import { GENRE_CLASS, GENRE_CLASS_PAST } from '@/components/guide/guide-metrics'

export type CellSize = 'md' | 's' | 'xs'

export interface CellLook {
  genre: Program['genre']
  past: boolean
  size: CellSize
  mark?: BookingMark
  selected: boolean
}

const SIZE_CLASS: Record<CellSize, string> = {
  md: 'px-[calc(7rem/16)] py-1',
  s: 'px-[calc(7rem/16)] py-0.5',
  xs: 'flex items-center px-1.5 py-0',
}

const MARK_CLASS: Record<BookingMark, string> = {
  booked: 'outline-2 -outline-offset-2 outline-mint',
  recording: 'outline-2 -outline-offset-2 outline-coral',
}

const held = new Map<string, string>()

/** The classes of a cell of the guide. There are a few hundred kinds of cell and a day has hundreds of cells, so each kind is merged once and kept. */
export function cellClassOf({
  genre,
  past,
  size,
  mark,
  selected,
}: CellLook): string {
  const key = `${genre}|${past}|${size}|${mark}|${selected}`
  const kept = held.get(key)

  if (kept !== undefined) {
    return kept
  }

  const merged = cn(
    'guide-cell',
    past ? GENRE_CLASS_PAST[genre] : GENRE_CLASS[genre],
    SIZE_CLASS[size],
    mark && MARK_CLASS[mark],
    selected && 'z-[3] border-brand shadow-pop',
  )

  held.set(key, merged)

  return merged
}
