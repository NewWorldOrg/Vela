'use client'

import { useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { SPAN_DASH } from '@/lib/format'
import type { LiveWatching } from '@/repository/live'
import { ProgressBar } from '@/components/vela/progress-bar'
import { ChannelMark } from '@/components/vela/channel-mark'
import { ChevronDownIcon, ChevronUpIcon } from '@/components/vela/icons'
import { pressable } from '@/components/vela/tactile'
import { ProgramDescription } from '@/components/guide/program-description'
import { ProgramExtended } from '@/components/guide/program-extended'

/** The programme on now, under the picture on a phone held upright: its title, its progress and what is left of it, the way out to another player and the reservation; its description unfolds under the chevron. */
export function PhoneLiveInfo({
  watching,
  external,
  record,
}: {
  watching: LiveWatching
  external: ReactNode
  record?: ReactNode
}) {
  const [unfolded, unfold] = useState(false)
  const { channel, progressPct, restMin } = watching
  const programme = channel.now
  const describes =
    programme !== undefined &&
    (programme.description !== undefined || programme.items !== undefined)

  return (
    <section data-slot="phone-live-info" className="px-4 pt-3 pb-3.5">
      <p className="mb-1 flex items-center gap-1.5 text-note text-ink-2">
        <ChannelMark logo={channel.logo} no={channel.no} />
        {channel.name}
      </p>
      <div className="flex items-start gap-2">
        <h1 className="heading min-w-0 flex-1 text-section leading-[1.45]">
          {programme ? programme.title : '番組情報がありません'}
        </h1>
        {describes && (
          <button
            type="button"
            aria-expanded={unfolded}
            aria-label="番組の詳細"
            onClick={() => unfold(!unfolded)}
            className={cn(
              '-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 outline-none focus-visible:shadow-ring [&_svg]:size-5',
              pressable,
            )}
          >
            {unfolded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </button>
        )}
      </div>
      {programme && (
        <div className="mt-1.5 flex items-center gap-2 font-code text-note text-ink-2">
          {programme.startLabel}
          <ProgressBar
            value={progressPct}
            label="番組の進行"
            className="min-w-[calc(60rem/16)] flex-1"
          />
          {programme.endLabel ?? '終了未定'}
          {restMin !== undefined && (
            <span className="font-body whitespace-nowrap">
              残り <span className="font-code">{restMin}</span> 分
            </span>
          )}
        </div>
      )}
      {unfolded && programme && (
        <div className="mt-3 border-t border-dashed border-line pt-3 [&>:last-child]:mb-0">
          <p className="mb-2 font-code text-note text-ink-2">
            {channel.name} {programme.startLabel}
            {SPAN_DASH}
            {programme.endLabel ?? '終了未定'}
          </p>
          {programme.description && (
            <ProgramDescription description={programme.description} />
          )}
          {programme.items?.map((item, index) => (
            <ProgramExtended key={index} item={item} />
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {external}
        {record}
      </div>
    </section>
  )
}
