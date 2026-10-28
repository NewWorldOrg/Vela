'use client'

import { useMemo, type ComponentProps } from 'react'

import { rowsOf, type PackedRows } from '@/lib/packed-rows'
import type { GridProgram, GuideResult } from '@/repository/programs'
import { GuideView } from '@/components/guide/guide-page'

export type PackedGuide = Omit<GuideResult, 'programs'> & {
  programs: PackedRows<GridProgram>
}

/** The guide as the page hands it over, its programmes packed field by field, unpacked once here. */
export function PackedGuideView({
  guide,
  ...rest
}: Omit<ComponentProps<typeof GuideView>, 'guide'> & { guide: PackedGuide }) {
  const unpacked = useMemo(
    () => ({ ...guide, programs: rowsOf(guide.programs) }),
    [guide],
  )

  return <GuideView guide={unpacked} {...rest} />
}
