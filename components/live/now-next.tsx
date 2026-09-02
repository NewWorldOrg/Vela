import type { LiveWatching } from '@/repository/live'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/vela/progress'
import { ChannelKey } from '@/components/live/channel-list'

/**
 * What is on the channel being watched, and how far into it the clock is:
 * the programme, its span, and the minutes it has left.
 */
export function NowNext({ watching }: { watching: LiveWatching }) {
  const { channel, progressPct, nowLabel, restMin } = watching
  const programme = channel.now

  return (
    <section
      data-slot="now-next"
      className="mt-4 rounded-lg bg-surface px-5 pt-[17px] pb-[19px]"
    >
      <div className="flex flex-wrap items-baseline gap-[11px]">
        {channel.no && <ChannelKey no={channel.no} />}
        <h1 className="heading text-[18px] leading-[1.45]">
          {programme ? programme.title : '番組情報がありません'}
        </h1>
        {programme && (
          <span className="ml-auto font-code text-ui whitespace-nowrap text-ink-2">
            {programme.startLabel}–{programme.endLabel ?? '終了未定'}
          </span>
        )}
      </div>
      <p className="text-ui text-ink-2">{channel.name}</p>
      {programme && (
        <div className="mt-[11px] flex items-center gap-[11px]">
          <span className="font-code text-note whitespace-nowrap text-ink-3">
            {nowLabel}
          </span>
          <ProgressBar
            value={progressPct}
            label="番組の進行"
            className="h-[5px] min-w-[60px] flex-1"
          />
          {restMin !== undefined && (
            <span className="font-code text-note whitespace-nowrap text-ink-3">
              残り {restMin} 分
            </span>
          )}
        </div>
      )}
      {programme && (programme.hasSubtitles || programme.genreLabel) && (
        <div className="mt-3 flex flex-wrap gap-[7px]">
          {programme.hasSubtitles && (
            <Badge variant="ok" className="font-bold">
              字幕あり
            </Badge>
          )}
          <Badge>{programme.genreLabel}</Badge>
        </div>
      )}
    </section>
  )
}
