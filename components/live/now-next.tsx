import type { LiveWatching } from '@/repository/live'
import { SPAN_DASH } from '@/lib/format'
import { saysSubtitled } from '@/lib/program-title'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/vela/progress'
import { ChannelMark } from '@/components/vela/channel-mark'
import {
  ProgramDescription,
  ProgramExtended,
} from '@/components/guide/program-description'

export function NowNext({ watching }: { watching: LiveWatching }) {
  const { channel, progressPct, nowLabel, restMin } = watching
  const programme = channel.now

  const subtitled =
    programme !== undefined &&
    programme.hasSubtitles &&
    !saysSubtitled(programme.title)

  return (
    <section
      data-slot="now-next"
      className="mt-4 rounded-lg bg-surface px-5 pt-[calc(17rem/16)] pb-[calc(19rem/16)]"
    >
      <div className="flex flex-wrap items-baseline gap-[calc(11rem/16)]">
        <ChannelMark
          logo={channel.logo}
          no={channel.no}
          className="self-center"
        />
        <h1 className="heading text-h2 leading-[1.45]">
          {programme ? programme.title : '番組情報がありません'}
        </h1>
        {programme && (
          <span className="ml-auto font-code text-ui whitespace-nowrap text-ink-2">
            {programme.startLabel}
            {SPAN_DASH}
            {programme.endLabel ?? '終了未定'}
          </span>
        )}
      </div>
      <p className="text-ui text-ink-2">{channel.name}</p>
      {programme && (
        <div className="mt-[calc(11rem/16)] flex items-center gap-[calc(11rem/16)]">
          <span className="font-code text-note whitespace-nowrap text-ink-3">
            {nowLabel}
          </span>
          <ProgressBar
            value={progressPct}
            label="番組の進行"
            className="h-[calc(5rem/16)] min-w-[calc(60rem/16)] flex-1"
          />
          {restMin !== undefined && (
            <span className="font-code text-note whitespace-nowrap text-ink-3">
              残り {restMin} 分
            </span>
          )}
        </div>
      )}
      {programme && (subtitled || programme.genreLabel) && (
        <div className="mt-3 flex flex-wrap gap-[calc(7rem/16)]">
          {subtitled && (
            <Badge variant="ok" className="font-bold">
              字幕あり
            </Badge>
          )}
          <Badge>{programme.genreLabel}</Badge>
        </div>
      )}
      {programme && (programme.description || programme.items) && (
        <div className="mt-[calc(17rem/16)] border-t border-dashed border-line pt-[calc(15rem/16)] [&>:last-child]:mb-0">
          {programme.description && (
            <ProgramDescription description={programme.description} />
          )}
          {programme.items?.map((item, index) => (
            <ProgramExtended key={index} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}
