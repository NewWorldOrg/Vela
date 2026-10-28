'use client'

import { useDeferredValue, useMemo, type ComponentProps } from 'react'

import { wholeDayOf } from '@/lib/guide'
import { rowsOf, type PackedRows } from '@/lib/packed-rows'
import type { GridProgram, GuideResult } from '@/repository/programs'
import { useSettled } from '@/hooks/useSettled'
import { GuideView } from '@/components/guide/guide-page'

export type PackedGuide = Omit<GuideResult, 'programs'> & {
  programs: PackedRows<GridProgram>
}

/** The guide as the page hands it over: the hours it opens on, packed field by field, and the rest of the day following in the same answer. Until the rest has come the screen has the opening hours. The whole day is then drawn in the background, the opening hours' programmes kept as the same objects so their cells are not drawn again. */
export function PackedGuideView({
  guide,
  rest,
  ...props
}: Omit<ComponentProps<typeof GuideView>, 'guide'> & {
  guide: PackedGuide
  rest?: Promise<PackedRows<GridProgram>>
}) {
  const settled = useDeferredValue(useSettled(rest))
  const opening = useMemo(() => rowsOf(guide.programs), [guide.programs])
  const later = useMemo(() => settled && rowsOf(settled), [settled])
  const unpacked = useMemo(
    () => ({
      ...guide,
      programs: later ? wholeDayOf(opening, later) : opening,
    }),
    [guide, opening, later],
  )

  return <GuideView guide={unpacked} {...props} />
}
