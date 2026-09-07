import { RECORDING_IN_PROGRESS_TERM } from '@/lib/state-terms'
import { Badge } from '@/components/ui/badge'
import { ListIcon } from '@/components/vela/icons'
import { ChipDot } from '@/components/vela/status'
import { TermTip } from '@/components/vela/term-tip'

export type RecordingChipMark = 'dot' | 'ledger'

export function RecordingInProgressChip({
  mark = 'dot',
}: {
  mark?: RecordingChipMark
}) {
  const ledger = mark === 'ledger'

  return (
    <TermTip term={RECORDING_IN_PROGRESS_TERM}>
      <Badge
        variant="recording"
        className={ledger ? 'gap-[7px] pl-[9px]' : undefined}
      >
        {ledger ? <ListIcon className="size-[13px]" /> : <ChipDot />}
        {RECORDING_IN_PROGRESS_TERM.label}
      </Badge>
    </TermTip>
  )
}
