import { cn } from '@/lib/utils'
import type { PlaybackStanding } from '@/repository/videos'
import {
  ListIcon,
  OutcomeFailedIcon,
  OutcomeTruncatedIcon,
  SuccessIcon,
} from '@/components/vela/icons'

/**
 * How the recording being played ended, said under the picture.
 *
 * The band at the top of the page carries the same words out of the ledger,
 * and for a recording that ran to the end that is the whole of it — a second
 * chip saying 完全 beside a picture that plays to its end says nothing the
 * picture is not already saying. It is drawn only where what can be watched is
 * not what was asked for: a recording that stops short and one that ran to the
 * end hand over pictures that look alike, and without this the reader watches
 * half a programme and is told nothing until it ends.
 *
 * Two tones, because it is read in two places. On the dark chrome — over a
 * picture that would not play — it is drawn in the player's own colours; under
 * the picture it is on the page's surface and takes the page's tokens, which
 * are the ones the contrast gate is set on.
 */
const STANDINGS: Record<
  PlaybackStanding,
  { label: string; body: string; player: string; page: string }
> = {
  whole: {
    label: '完全',
    body: '録画全体が再生されます',
    player:
      'border-[rgba(134,210,172,.45)] bg-[rgba(134,210,172,.12)] text-[#9FDCBB]',
    page: 'border-mint-line bg-mint-soft text-mint',
  },
  cutShort: {
    label: '尻切れ',
    body: '録画は途中で終わっています。欠けた部分は再生されません',
    player:
      'border-[rgba(229,186,108,.5)] bg-[rgba(229,186,108,.14)] text-[#E5BA6C]',
    page: 'border-lemon-line bg-lemon-soft text-lemon',
  },
  failed: {
    label: '失敗',
    body: '再生できるものがありません',
    player:
      'border-[rgba(236,154,147,.5)] bg-[rgba(236,154,147,.14)] text-[#EC9A93]',
    page: 'border-coral-line bg-coral-soft text-coral',
  },
  notEndedYet: {
    label: '録画中',
    body: '書き込み中の録画です',
    player:
      'border-[rgba(236,154,147,.5)] bg-[rgba(236,154,147,.14)] text-[#EC9A93]',
    page: 'border-coral-line bg-coral-soft text-coral',
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
  tone = 'player',
  className,
}: {
  standing: PlaybackStanding
  tone?: 'player' | 'page'
  className?: string
}) {
  const shown = STANDINGS[standing]
  const Mark = MARKS[standing]

  return (
    <span
      data-standing={standing}
      className={cn(
        'inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-full border py-[3px] pr-3.5 pl-[9px] text-[11.5px]',
        tone === 'page' ? shown.page : shown.player,
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5 font-bold">
        <Mark className="size-3.5" />
        {shown.label}
      </span>
      <span
        className={cn(
          'font-normal',
          tone === 'page' ? 'text-ink-2' : 'text-(--pl-ink-2)',
        )}
      >
        {shown.body}
      </span>
    </span>
  )
}
