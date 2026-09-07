'use client'

import { useState, type RefObject } from 'react'

import { cn } from '@/lib/utils'
import { videoFileHref } from '@/repository/video-paths'
import type { TicketWrite } from '@/repository/videos'
import { Spinner } from '@/components/vela/progress'
import { Button } from '@/components/ui/button'
import { AirPlayIcon } from '@/components/vela/icons'
import {
  PLAYER_BUTTON,
  PLAYER_GLYPH_BUTTON,
} from '@/components/recordings/player-palette'

type Picker = { webkitShowPlaybackTargetPicker?: () => void }

const NO_AIRPLAY = 'このブラウザは AirPlay に対応していません。'

function ticketed(id: string, inTheClear: string) {
  const url = new URL(videoFileHref(id), window.location.href)
  url.username = 'ticket'
  url.password = inTheClear

  return url.toString()
}

async function ticket(
  id: string,
  onTakeTicket: (id: string) => Promise<TicketWrite>,
): Promise<{ href: string } | { refused: string }> {
  const write = await onTakeTicket(id)

  if (write.state !== 'ok') {
    return { refused: write.message }
  }

  return { href: ticketed(id, write.ticket.inTheClear) }
}

export function OpenExternally({
  id,
  onTakeTicket,
  tone = 'page',
  className,
}: {
  id: string
  onTakeTicket: (id: string) => Promise<TicketWrite>
  tone?: 'page' | 'player'
  className?: string
}) {
  const [taking, setTaking] = useState(false)
  const [refused, setRefused] = useState<string | null>(null)

  const open = async () => {
    setRefused(null)
    setTaking(true)

    try {
      const got = await ticket(id, onTakeTicket)

      if ('refused' in got) {
        setRefused(got.refused)

        return
      }

      window.open(got.href, '_blank', 'noopener')
    } finally {
      setTaking(false)
    }
  }

  return (
    <div className={cn('flex flex-col items-start gap-1.5', className)}>
      {tone === 'player' ? (
        <button
          type="button"
          onClick={open}
          aria-disabled={taking}
          className={PLAYER_BUTTON}
        >
          {taking && <Spinner className="mr-1.5 inline size-3" />}
          外部プレイヤーで開く
        </button>
      ) : (
        <Button variant="outline" onClick={open} aria-disabled={taking}>
          {taking && <Spinner className="size-3.5" />}
          外部プレイヤーで開く
        </Button>
      )}
      {refused && (
        <p
          role="status"
          className={cn(
            'text-[11px]',
            tone === 'player' ? 'text-[#EC9A93]' : 'text-coral',
          )}
        >
          {refused}
        </p>
      )}
    </div>
  )
}

export function AirPlayButton({
  id,
  onTakeTicket,
  video,
  onRefused,
}: {
  id: string
  onTakeTicket: (id: string) => Promise<TicketWrite>
  video: RefObject<HTMLVideoElement | null>
  onRefused: (message: string) => void
}) {
  const [taking, setTaking] = useState(false)

  const pick = async () => {
    setTaking(true)

    try {
      const element = video.current
      const picker = (element as (HTMLVideoElement & Picker) | null)
        ?.webkitShowPlaybackTargetPicker

      if (!element || typeof picker !== 'function') {
        onRefused(NO_AIRPLAY)

        return
      }

      const got = await ticket(id, onTakeTicket)

      if ('refused' in got) {
        onRefused(got.refused)

        return
      }

      element.src = got.href
      picker.call(element)
    } finally {
      setTaking(false)
    }
  }

  return (
    <button
      type="button"
      onClick={pick}
      aria-disabled={taking}
      aria-label="AirPlay"
      className={PLAYER_GLYPH_BUTTON}
    >
      {taking ? <Spinner className="size-5" /> : <AirPlayIcon />}
    </button>
  )
}
