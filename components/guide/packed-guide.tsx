'use client'

import { useMemo, type ComponentProps } from 'react'

import { wholeDayOf } from '@/lib/guide'
import { rowsOf, type PackedRows } from '@/lib/packed-rows'
import type { GridProgram, GuideResult } from '@/repository/programs'
import { useSettledKept } from '@/hooks/useSettled'
import { GuideView } from '@/components/guide/guide-page'

export type PackedGuide = Omit<GuideResult, 'programs'> & {
  programs: PackedRows<GridProgram>
}

/** The guide as the page hands it over: the hours it opens on, packed field by field, and the rest of the day following in the same answer. Until the rest has come the screen has the opening hours; then it has the whole day. A refresh keeps the rest it had for the same day and kind until the new rest comes. */
export function PackedGuideView({
  guide,
  rest,
  ...props
}: Omit<ComponentProps<typeof GuideView>, 'guide'> & {
  guide: PackedGuide
  rest?: Promise<PackedRows<GridProgram>>
}) {
  const later = useSettledKept(rest, `${guide.day.date}|${guide.kind}`)
  const unpacked = useMemo(
    () => ({
      ...guide,
      programs: later
        ? wholeDayOf(rowsOf(guide.programs), rowsOf(later))
        : rowsOf(guide.programs),
    }),
    [guide, later],
  )

  return <GuideView guide={unpacked} {...props} />
}
