import { lastRoundOf, nextRoundOf } from '@/lib/segment-detection'
import type { SegmentRound } from '@/repository/segment-status'

export const LEARNING_ROUNDS_SLOT = 'segment-learning-rounds'

export function LearningRounds({
  lastRound,
  nextRound,
}: {
  lastRound?: SegmentRound
  nextRound?: string
}) {
  return (
    <p
      data-slot={LEARNING_ROUNDS_SLOT}
      className="mb-3 text-note leading-[1.7] text-ink-2"
    >
      {`${lastRoundOf(lastRound)}${nextRoundOf(nextRound)}`}
    </p>
  )
}
