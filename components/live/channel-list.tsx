'use client'

import { useEffect, useId, useRef } from 'react'

import { cn } from '@/lib/utils'
import { foldBand, foldBandDelay, type FoldMotion } from '@/lib/live-fold'
import type { ChannelKind } from '@/repository/channels'
import type { LiveChannel } from '@/repository/live'
import { Button } from '@/components/ui/button'
import { ChannelsMissing } from '@/components/live/channels-missing'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LiveIcon,
} from '@/components/vela/icons'
import { pressable } from '@/components/vela/tactile'
import { ChannelMark } from '@/components/vela/channel-mark'
import { ChannelKinds } from '@/components/live/channel-kinds'

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

  useEffect(() => {
    const whole = listed.current

    if (phase === 'still' || settle === undefined || whole === null) {
      return
    }

    const running = whole.getAnimations({ subtree: true })

    if (running.length === 0) {
      settle()

      return
    }

    let left = false

    void Promise.allSettled(running.map((one) => one.finished)).then(() => {
      if (!left) {
        settle()
      }
    })

    return () => {
      left = true
    }
  }, [phase, settle])

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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="チャンネル一覧"
            aria-expanded={!folded}
            aria-controls={body}
            onClick={() => onFold(!folded)}
            className="pointer-events-auto"
          >
            {folded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </Button>
        )}
      </div>
      {shown && (
        <div id={body} inert={folded} className="flex min-h-0 flex-1 flex-col">
          <div
            style={{ transitionDelay: foldBandDelay(1, motion) }}
            className={cn(
              'flex items-center gap-[7px] px-1 pb-2 text-cap font-bold tracking-[0.06em] text-ink-3',
              foldBand(motion),
            )}
          >
            <LiveIcon className="size-3.5 text-brand" />
            放送中
            <i className="h-px flex-1 border-t border-dashed border-line not-italic" />
          </div>
          {channels.length === 0 ? (
            <div
              style={{ transitionDelay: foldBandDelay(2, motion) }}
              className={foldBand(motion)}
            >
              <ChannelsMissing kind={kind} kinds={kinds} onKind={onKind} />
            </div>
          ) : (
            <ul className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-lg">
              {channels.map((channel, nth) => {
                const on = channel.id === watchingId

                return (
                  <li
                    key={channel.id}
                    style={{ transitionDelay: foldBandDelay(nth + 2, motion) }}
                    className={cn(
                      'border-b border-dashed border-line bg-surface last:border-b-0',
                      foldBand(motion),
                    )}
                  >
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => onSelect(channel)}
                      className={cn(
                        'flex min-h-11 w-full items-start gap-[11px] rounded-lg px-3 py-2.5 text-left outline-none',
                        'transition-[background-color] duration-150 ease-out hover:bg-surface-2 focus-visible:shadow-ring',
                        on && 'bg-brand-soft hover:bg-brand-soft',
                        pressable,
                      )}
                    >
                      <ChannelMark
                        logo={channel.logo}
                        no={channel.no}
                        on={on}
                        keepsTheSlot
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'block truncate text-ui font-bold',
                            on && 'text-brand',
                          )}
                        >
                          {channel.name}
                        </span>
                        {channel.now ? (
                          <span className="block truncate text-sub text-ink-2">
                            {channel.now.title}
                          </span>
                        ) : (
                          <span className="block text-sub text-ink-3">
                            番組情報がありません
                          </span>
                        )}
                        {channel.next && (
                          <span className="mt-px block truncate text-note text-ink-3">
                            次{' '}
                            <span className="font-code">
                              {channel.next.startLabel}
                            </span>{' '}
                            {channel.next.title}
                          </span>
                        )}
                      </span>
                      {channel.viewers > 0 && (
                        <span
                          aria-label={`視聴者 ${channel.viewers}`}
                          className="mt-[7px] inline-flex shrink-0 items-center gap-1.5 font-code text-note text-coral"
                        >
                          <i
                            aria-hidden="true"
                            className="size-[7px] rounded-full bg-coral"
                          />
                          {channel.viewers}
                        </span>
                      )}
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
