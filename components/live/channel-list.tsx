'use client'

import { useId } from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import type { ChannelKind } from '@/repository/channels'
import { CHANNEL_KINDS } from '@/repository/channels'
import type { LiveChannel } from '@/repository/live'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/vela/empty-state'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LiveIcon,
} from '@/components/vela/icons'
import { pressable } from '@/components/vela/tactile'

/** The remote-control key, as a small plate. */
export function ChannelKey({
  no,
  on,
  className,
}: {
  no: string
  on?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-[10px] border border-line bg-surface-2 px-2 font-code text-[11px] leading-[1.7] font-medium text-ink-2',
        on && 'border-brand-line bg-surface text-brand',
        className,
      )}
    >
      {no}
    </span>
  )
}

/**
 * The channels of one broadcast type, one row each, with what is on air and
 * what follows it. The row is the press: pressing a channel is choosing it.
 *
 * The list scrolls inside itself, under a heading that stays, so that a long
 * list is sent past without the picture beside it moving. Rows sit against one
 * another, so each is at least the height a finger needs rather than being
 * given an area that would reach into its neighbours.
 *
 * Given `onFold`, the list folds away and comes back on one press. The press is
 * at the far edge of the list, where it stands whether the list is open or
 * folded, so that folding does not move the thing that unfolds. Folded, only
 * that press is left; the types and the rows are taken out of the page rather
 * than dimmed, because a list that cannot be read is not a list that is off.
 */
export function ChannelList({
  kind,
  channels,
  watchingId,
  onKind,
  onSelect,
  folded,
  onFold,
  className,
}: {
  kind: ChannelKind
  channels: LiveChannel[]
  /** The channel being watched, where it is on this list. */
  watchingId?: string
  onKind: (kind: ChannelKind) => void
  onSelect: (channel: LiveChannel) => void
  /** Folded away, leaving only the press that brings it back. */
  folded?: boolean
  /** Given, the list can be folded; left out, it cannot. */
  onFold?: (folded: boolean) => void
  className?: string
}) {
  const body = useId()

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="mb-3.5 flex items-start justify-end gap-1.5">
        <div
          role="group"
          aria-label="放送の種別"
          className={cn(
            'flex min-w-0 flex-1 flex-wrap gap-1.5',
            folded && 'hidden',
          )}
        >
          {CHANNEL_KINDS.map((one) => (
            <button
              key={one.value}
              type="button"
              aria-pressed={one.value === kind}
              onClick={() => onKind(one.value)}
              className={cn(
                'tap-target rounded-full border border-edge bg-transparent px-[15px] py-[5px] text-ui font-medium whitespace-nowrap text-ink-2 outline-none',
                'transition-[background-color,color,translate] duration-150 ease-toy hover:bg-surface hover:text-ink hover:-translate-x-px hover:-translate-y-px focus-visible:shadow-ring',
                one.value === kind &&
                  'border-brand bg-brand-soft font-bold text-brand',
                pressable,
              )}
            >
              {one.label}
            </button>
          ))}
        </div>
        {onFold && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="チャンネル一覧"
            aria-expanded={!folded}
            aria-controls={body}
            onClick={() => onFold(!folded)}
          >
            {folded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </Button>
        )}
      </div>
      <div
        id={body}
        className={cn('flex min-h-0 flex-1 flex-col', folded && 'hidden')}
      >
        <div className="flex items-center gap-[7px] px-1 pb-2 text-cap font-bold tracking-[0.06em] text-ink-3">
          <LiveIcon className="size-3.5 text-brand" />
          放送中
          <i className="h-px flex-1 border-t border-dashed border-line not-italic" />
        </div>
        {channels.length === 0 ? (
          <EmptyState
            spot="antenna"
            title="視聴できるチャンネルがありません"
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings/channels">チャンネル設定へ</Link>
              </Button>
            }
          />
        ) : (
          <ul className="min-h-0 flex-1 overflow-y-auto rounded-lg bg-surface">
            {channels.map((channel) => {
              const on = channel.id === watchingId

              return (
                <li
                  key={channel.id}
                  className="border-b border-dashed border-line last:border-b-0"
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
                    {channel.no && (
                      <ChannelKey no={channel.no} on={on} className="mt-0.5" />
                    )}
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
    </div>
  )
}
