import { RECORDING_IN_PROGRESS_TERM } from '@/lib/state-terms'
import { alsoSays } from '@/components/recordings/status-cell'
import { Badge, type BadgeWidth } from '@/components/ui/badge'
import { ListIcon } from '@/components/vela/icons'
import { ChipDot } from '@/components/vela/status'
import { TermTip } from '@/components/vela/term-tip'

export type RecordingChipMark = 'dot' | 'ledger'

export function RecordingInProgressChip({
  mark = 'dot',
  width,
  also = [],
}: {
  mark?: RecordingChipMark
  width?: BadgeWidth
  also?: (string | undefined | false)[]
}) {
  const ledger = mark === 'ledger'
  const term = alsoSays(RECORDING_IN_PROGRESS_TERM, ...also)

  return (
    <TermTip term={term}>
      <Badge
        variant="recording"
        width={width}
        className={ledger ? 'gap-[7px] pl-[9px]' : undefined}
      >
        {ledger ? <ListIcon className="size-[13px]" /> : <ChipDot />}
        {term.label}
      </Badge>
    </TermTip>
  )
}
