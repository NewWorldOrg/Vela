import { cn } from '@/lib/utils'
import type { PlaybackStanding } from '@/repository/videos'
import {
  ListIcon,
  OutcomeFailedIcon,
  OutcomeTruncatedIcon,
  SuccessIcon,
} from '@/components/vela/icons'

/**
 * How the recording being played ended, said on the player itself.
 *
 * The band above the player carries the same three words out of the ledger.
 * This one is read off the playback plan, beside the picture it belongs to,
 * because a recording that stops short and one that ran to the end hand over
 * pictures that look alike: without it the reader watches half a programme and
 * is told nothing until it ends.
 */
const STANDINGS: Record<
  PlaybackStanding,
  { label: string; body: string; tone: string; mark: string }
> = {
  whole: {
    label: '完全',
    body: '録画全体が再生されます',
    tone: 'border-[rgba(134,210,172,.45)] bg-[rgba(134,210,172,.12)] text-[#9FDCBB]',
    mark: 'text-[#9FDCBB]',
  },
  cutShort: {
    label: '尻切れ',
    body: '録画は途中で終わっています。欠けた部分は再生されません',
    tone: 'border-[rgba(229,186,108,.5)] bg-[rgba(229,186,108,.14)] text-[#E5BA6C]',
    mark: 'text-[#E5BA6C]',
  },
  failed: {
    label: '失敗',
    body: '再生できるものがありません',
    tone: 'border-[rgba(236,154,147,.5)] bg-[rgba(236,154,147,.14)] text-[#EC9A93]',
    mark: 'text-[#EC9A93]',
  },
  notEndedYet: {
    label: '録画中',
    body: '書き込み中の録画です',
    tone: 'border-[rgba(236,154,147,.5)] bg-[rgba(236,154,147,.14)] text-[#EC9A93]',
    mark: 'text-[#EC9A93]',
  },
}

const MARKS = {
  whole: SuccessIcon,
  cutShort: OutcomeTruncatedIcon,
  failed: OutcomeFailedIcon,
  notEndedYet: ListIcon,
} as const

export function PlaybackStandingChip({
  standing,
  className,
}: {
  standing: PlaybackStanding
  className?: string
}) {
  const shown = STANDINGS[standing]
  const Mark = MARKS[standing]

  return (
    <span
      data-standing={standing}
      className={cn(
        'inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-full border py-[3px] pr-3.5 pl-[9px] text-[11.5px]',
        shown.tone,
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5 font-bold">
        <Mark className={cn('size-3.5', shown.mark)} />
        {shown.label}
      </span>
      <span className="font-normal text-(--pl-ink-2)">{shown.body}</span>
    </span>
  )
}
