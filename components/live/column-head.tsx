'use client'

import { type ReactNode } from 'react'

import { FoldButton } from '@/components/live/fold-button'

const UNDER_THE_HEAD = 14

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
