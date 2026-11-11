'use client'

import { type ReactNode } from 'react'

import { FoldButton } from '@/components/live/fold-button'

/** The gap under the column's head, as the mock lays the remote under it. */
const UNDER_THE_HEAD = 14

/** The head of the column while the data broadcast is open: what stands at its left, and the fold at its right end, with the remote 14 below. */
export function ColumnHead({
  folded,
  onFold,
  controls,
  foldLabel,
  children,
}: {
  folded: boolean
  onFold: (folded: boolean) => void
  controls?: string
  foldLabel?: string
  children?: ReactNode
}) {
  return (
    <div
      data-slot="column-head"
      style={{ marginBottom: UNDER_THE_HEAD }}
      className="flex items-start justify-end gap-1.5"
    >
      {children}
      <FoldButton
        folded={folded}
        onFold={onFold}
        controls={controls}
        label={foldLabel}
      />
    </div>
  )
}
