'use client'

import { exclusionPartsOf } from '@/lib/rules'
import type { RuleExclusion } from '@/repository/rules'
import { Count } from '@/components/reservations/rules/count'

export function Excluded({
  excluded,
  as: Tag,
}: {
  excluded: RuleExclusion
  as: 'p' | 'span'
}) {
  const parts = exclusionPartsOf(excluded)

  if (parts.length === 0) {
    return null
  }

  return (
    <Tag data-excluded="" className="text-note text-ink-2">
      <Count value={parts.reduce((sum, part) => sum + part.count, 0)} />{' '}
      件は除外されました(
      {parts.map((part, at) => (
        <span key={part.label}>
          {at > 0 && '、'}
          {part.label} <Count value={part.count} /> 件
        </span>
      ))}
      )。
    </Tag>
  )
}
