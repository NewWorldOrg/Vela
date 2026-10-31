'use client'

import { cn } from '@/lib/utils'
import { unfinishedDeletionShapeOf } from '@/lib/recordings'
import type { Recording } from '@/repository/recordings'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'
import { InFull } from '@/components/vela/in-full'
import { OutcomeChip } from '@/components/recordings/outcome-chip'
import { EncodeChip } from '@/components/recordings/encode-chip'
import { QualityChip } from '@/components/recordings/quality-chip'
import { LeftScrambledChip } from '@/components/recordings/left-scrambled-chip'
import { FileMissingChip } from '@/components/recordings/file-missing-chip'

/** The encode states a recording names, each with the word that says it is the encode's. */
const SHOWN_ENCODE: Partial<Record<Recording['encode'], string>> = {
  queued: 'エンコード待ち',
  running: 'エンコード中',
  failed: 'エンコード失敗',
}

/** Only the states of a recording that want a look: how it ended where it did not end well, what is wrong with it, and an encode not yet done. */
export function attentionOf(recording: Recording) {
  const r = recording
  const left = unfinishedDeletionShapeOf(r)

  return [
    r.outcome !== 'complete' && (
      <OutcomeChip key="outcome" recording={r} also={[r.outcomeDetail]} />
    ),
    (r.quality.level === 'warning' ||
      r.quality.level === 'mayNotBeWatchable') && (
      <QualityChip key="quality" recording={r} also={[r.quality.detail]} />
    ),
    r.gap && (
      <InFull key="gap" says={r.gap.detail}>
        <Badge data-slot="gap-mark" variant="warn">
          {r.gap.label}
        </Badge>
      </InFull>
    ),
    r.leftScrambled && <LeftScrambledChip key="scrambled" />,
    r.fileMissing && <FileMissingChip key="missing" />,
    left && (
      <InFull key="left" says={left.detail ?? left.label}>
        <Badge variant="warn">
          <ChipDot />
          {left.label}
        </Badge>
      </InFull>
    ),
    SHOWN_ENCODE[r.encode] && (
      <EncodeChip key="encode" recording={r} says={SHOWN_ENCODE[r.encode]} />
    ),
  ].filter(Boolean)
}

export function AttentionChips({
  recording,
  className,
}: {
  recording: Recording
  className?: string
}) {
  const chips = attentionOf(recording)

  if (chips.length === 0) {
    return null
  }

  return (
    <span
      data-slot="attention"
      className={cn('flex flex-wrap gap-1.5', className)}
    >
      {chips}
    </span>
  )
}
