'use client'

import { useId, useRef } from 'react'

import { cn } from '@/lib/utils'
import { foldBand, foldBandDelay, type FoldMotion } from '@/lib/live-fold'
import type { ChannelKind } from '@/repository/channels'
import type { LiveChannel } from '@/repository/live'
import { Button } from '@/components/ui/button'
import { ChannelsMissing } from '@/components/live/channels-missing'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/vela/icons'
import { pressable } from '@/components/vela/tactile'
import { ChannelMark } from '@/components/vela/channel-mark'
import { ChannelKinds } from '@/components/live/channel-kinds'
import { useSettled } from '@/components/live/channel-fold'

/** The column's fold: a chevron pointing where the column goes, named for what the column holds. */
export function FoldButton({
  folded,
  onFold,
  controls,
  label = 'チャンネル一覧',
}: {
  folded: boolean
  onFold: (folded: boolean) => void
  controls?: string
  label?: string
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-expanded={!folded}
      aria-controls={controls}
      onClick={() => onFold(!folded)}
      className="pointer-events-auto"
    >
      {folded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </Button>
  )
}

export function ChannelList({
  kind,
  kinds,
  channels,
  watchingId,
  onKind,
  onSelect,
  folded,
  onFold,
  motion,
  className,
}: {
  kind: ChannelKind
  kinds: ChannelKind[]
  channels: LiveChannel[]
  watchingId?: string
  onKind: (kind: ChannelKind) => void
  onSelect: (channel: LiveChannel) => void
  folded?: boolean
  onFold?: (folded: boolean) => void
  motion?: FoldMotion
  className?: string
}) {
  const body = useId()
  const listed = useRef<HTMLDivElement>(null)
  const phase = motion?.phase ?? 'still'
  const settle = motion?.onSettle
  const shown = motion === undefined ? !folded : motion.shown

  useSettled(listed, phase, settle)

  return (
    <div
      ref={listed}
      data-slot="channel-list"
      data-fold={phase}
      className={cn(
        'flex min-h-0 flex-col data-[fold=closing]:pointer-events-none',
        className,
      )}
    >
      <div className="mb-3.5 flex items-start justify-end gap-1.5">
        {shown && (
          <div className="min-w-0 flex-1 overflow-clip [overflow-clip-margin:6px]">
            <div
              style={{ transitionDelay: foldBandDelay(0, motion) }}
              className={foldBand(motion)}
            >
              <ChannelKinds kind={kind} kinds={kinds} onKind={onKind} />
            </div>
          </div>
        )}
        {onFold && (
          <FoldButton
            folded={folded ?? false}
            onFold={onFold}
            controls={body}
          />
        )}
      </div>
      {shown && (
        <div id={body} inert={folded} className="flex min-h-0 flex-1 flex-col">
          {channels.length === 0 ? (
            <div
              style={{ transitionDelay: foldBandDelay(2, motion) }}
              className={foldBand(motion)}
            >
              <ChannelsMissing kind={kind} kinds={kinds} onKind={onKind} />
            </div>
          ) : (
            <ul className="-mx-[calc(7rem/16)] flex min-h-0 flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto px-[calc(7rem/16)]">
              {channels.map((channel, nth) => {
                const on = channel.id === watchingId

                return (
                  <li
                    key={channel.id}
                    style={{ transitionDelay: foldBandDelay(nth + 2, motion) }}
                    className={foldBand(motion)}
                  >
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => onSelect(channel)}
                      className={cn(
                        'grid min-h-11 w-full grid-cols-[calc(112rem/16)_minmax(0,1fr)] items-center gap-3.5 rounded-[calc(14rem/16)] p-[calc(7rem/16)] text-left outline-none',
                        'transition-[background-color] duration-(--dur) ease-(--ease) hover:bg-surface focus-visible:shadow-ring',
                        on && 'bg-surface-2 hover:bg-surface-2',
                        pressable,
                      )}
                    >
                      <span className="relative">
                        <ChannelMark
                          logo={channel.logo}
                          no={channel.no}
                          shape="tile"
                          keepsTheSlot
                        />
                        {on && (
                          <i
                            data-slot="watching-mark"
                            aria-hidden="true"
                            className="absolute inset-0 rounded-sm shadow-[inset_0_0_0_2px_var(--ink)] not-italic"
                          />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-sub text-ink-2">
                          {channel.no && (
                            <span className="font-code">{channel.no}</span>
                          )}
                          <span className="[overflow-wrap:anywhere]">
                            {channel.name}
                          </span>
                        </span>
                        {channel.now ? (
                          <span className="mt-0.5 block text-[calc(14.5rem/16)] leading-[calc(19rem/16)] font-semibold [overflow-wrap:anywhere]">
                            {channel.now.title}
                          </span>
                        ) : (
                          <span className="mt-0.5 block text-ui text-ink-2">
                            番組情報がありません
                          </span>
                        )}
                        {channel.next && (
                          <span className="mt-0.5 block text-note text-ink-2 [overflow-wrap:anywhere]">
                            次{' '}
                            <span className="font-code">
                              {channel.next.startLabel}
                            </span>{' '}
                            {channel.next.title}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
