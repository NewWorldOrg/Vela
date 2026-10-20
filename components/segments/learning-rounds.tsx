import {
  ROUNDS_EXPLAINED,
  ROUNDS_LEARNING_OFF,
  lastRoundOf,
  nextRoundOf,
} from '@/lib/segment-detection'
import type { SegmentRound } from '@/repository/segment-status'

export const LEARNING_ROUNDS_SLOT = 'segment-learning-rounds'

const SAYS = 'text-note leading-[1.7] text-ink-2'

export function LearningRounds({
  learning,
  lastRound,
  nextRound,
}: {
  learning: boolean
  lastRound?: SegmentRound
  nextRound: string
}) {
  return (
    <div data-slot={LEARNING_ROUNDS_SLOT} className="mb-3 space-y-1">
      <p className={SAYS}>
        {learning ? ROUNDS_EXPLAINED : ROUNDS_LEARNING_OFF}
      </p>
      <p className={SAYS}>
        {lastRoundOf(lastRound)}
        {learning && nextRoundOf(nextRound)}
      </p>
    </div>
  )
}
