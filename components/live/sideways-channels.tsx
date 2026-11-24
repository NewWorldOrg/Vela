'use client'

import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'
import type { ChannelKind } from '@/repository/channels'
import { CHANNEL_KIND_LABEL, CHANNEL_KIND_ORDER } from '@/repository/channels'
import type { LiveChannel } from '@/repository/live'
import { ChannelMark } from '@/components/vela/channel-mark'
import { InfoIcon, SwapIcon } from '@/components/vela/icons'
import { Spinner } from '@/components/vela/spinner'
import { pressable, still } from '@/lib/tactile'
import {
  STRIP_BUTTON,
  StripFaceButton,
} from '@/components/recordings/strip-face-button'

export const PROGRAMME_FACE = '番組'

export function kindAfter(
  kind: ChannelKind,
  kinds: ChannelKind[],
): ChannelKind {
  const offered = CHANNEL_KIND_ORDER.filter((one) => kinds.includes(one))
  const at = offered.indexOf(kind)

  return offered[(at + 1) % offered.length] ?? kind
}

export function SidewaysChannels({
  kind,
  kinds,
  onKind,
  channels,
  watchingId,
  preparing,
  onSelect,
}: {
  kind: ChannelKind
  kinds: ChannelKind[]
  onKind: (kind: ChannelKind) => void
  channels: LiveChannel[]
  watchingId?: string
  preparing: boolean
  onSelect: (channel: LiveChannel) => void
}) {
  const watched = useRef<HTMLButtonElement>(null)
  const turns =
    CHANNEL_KIND_ORDER.filter((one) => kinds.includes(one)).length > 1

  useEffect(() => {
    watched.current?.scrollIntoView({ block: 'nearest' })
  }, [watchingId, kind])

  return (
    <>
      {turns && (
        <button
          type="button"
          aria-label={`放送の種別 ${CHANNEL_KIND_LABEL[kind]}`}
          onClick={() => onKind(kindAfter(kind, kinds))}
          className={cn(
            STRIP_BUTTON,
            'rounded-md bg-white/8 text-(--pl-ink) [&_svg]:size-[calc(14rem/16)] [&_svg]:text-(--pl-ink-2)',
          )}
        >
          <SwapIcon />
          {CHANNEL_KIND_LABEL[kind]}
        </button>
      )}
      <ul
        aria-label="チャンネル"
        data-slot="sideways-channels"
        className="flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto overscroll-contain py-0.5 [scrollbar-width:none]"
      >
        {channels.map((channel) => {
          const on = channel.id === watchingId

          return (
            <li key={channel.id} className="shrink-0">
              <button
                ref={on ? watched : undefined}
                type="button"
                aria-pressed={on}
                aria-busy={on && preparing ? true : undefined}
                onClick={() => onSelect(channel)}
                className={cn(
                  'relative flex w-[calc(52rem/16)] flex-col items-center gap-1 rounded-md px-0.5 pt-1.5 pb-1 outline-none hover:bg-white/6 focus-visible:shadow-ring',
                  on &&
                    'bg-white/8 shadow-[inset_0_0_0_2px_var(--pl-accent)] hover:bg-white/8',
                  pressable,
                  still,
                )}
              >
                <ChannelMark logo={channel.logo} no={channel.no} keepsTheSlot />
                <span
                  className={cn(
                    'line-clamp-2 w-full text-center text-[calc(10rem/16)] leading-[1.2] break-all text-(--pl-ink-3)',
                    on && 'font-bold text-(--pl-ink)',
                  )}
                >
                  {channel.name}
                </span>
                {on && preparing && (
                  <Spinner
                    size="control"
                    className="absolute top-1 right-1 text-(--pl-accent)"
                  />
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <StripFaceButton face={PROGRAMME_FACE} glyph={<InfoIcon />} />
    </>
  )
}
