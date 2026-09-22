import { RECORDING_IN_PROGRESS_TERM } from '@/lib/state-terms'
import { alsoSays } from '@/components/recordings/status-cell'
import { Badge } from '@/components/ui/badge'
import { ListIcon } from '@/components/vela/icons'
import { ChipDot } from '@/components/vela/status'
import { TermTip } from '@/components/vela/term-tip'

export type RecordingChipMark = 'dot' | 'ledger'

export function RecordingInProgressChip({
  mark = 'dot',
  also = [],
}: {
  mark?: RecordingChipMark
  also?: (string | undefined | false)[]
}) {
  const ledger = mark === 'ledger'
  const term = alsoSays(RECORDING_IN_PROGRESS_TERM, ...also)

  return (
    <TermTip term={term}>
      <Badge
        variant="recording"
        className={
          ledger ? 'gap-[calc(7rem/16)] pl-[calc(9rem/16)]' : undefined
        }
      >
        {ledger ? (
          <ListIcon className="size-[calc(13rem/16)]" />
        ) : (
          <ChipDot className="breathes" />
        )}
        {term.label}
      </Badge>
    </TermTip>
  )
}
