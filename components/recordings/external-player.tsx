'use client'

import { useState, type RefObject } from 'react'

import { cn } from '@/lib/utils'
import { videoFileHref } from '@/repository/video-paths'
import type { TicketWrite } from '@/repository/videos'
import { Spinner } from '@/components/vela/progress'
import { PLAYER_BUTTON } from '@/components/recordings/player-palette'

/**
 * The two ways out of the page: a player outside the browser, and a screen in
 * the room.
 *
 * Both reach the recording by the byte range, which is the one path that
 * answers a seek without building anything, and both carry a ticket to get
 * there. The ticket lapses in half a minute, so it is taken when the button is
 * pressed — one drawn into the page would be stale by the time anyone read the
 * page, and a page left open would hold a working key to the recording for as
 * long as it stayed open.
 */
type Picker = { webkitShowPlaybackTargetPicker?: () => void }

const NO_AIRPLAY = 'このブラウザは AirPlay に対応していません。'

function ticketed(id: string, inTheClear: string) {
  const url = new URL(videoFileHref(id), window.location.href)
  url.username = 'ticket'
  url.password = inTheClear

  return url.toString()
}

export function ExternalPlayer({
  id,
  onTakeTicket,
  video,
  className,
}: {
  id: string
  onTakeTicket: (id: string) => Promise<TicketWrite>
  /** The element AirPlay hands over. Absent where no picture is drawn. */
  video?: RefObject<HTMLVideoElement | null>
  className?: string
}) {
  const [taking, setTaking] = useState<'external' | 'airplay' | null>(null)
  const [refused, setRefused] = useState<string | null>(null)

  const take = async (which: 'external' | 'airplay') => {
    setRefused(null)
    setTaking(which)

    try {
      const write = await onTakeTicket(id)

      if (write.state !== 'ok') {
        setRefused(write.message)

        return
      }

      const href = ticketed(id, write.ticket.inTheClear)

      if (which === 'external') {
        window.open(href, '_blank', 'noopener')

        return
      }

      const element = video?.current
      const picker = (element as (HTMLVideoElement & Picker) | null | undefined)
        ?.webkitShowPlaybackTargetPicker

      if (!element || typeof picker !== 'function') {
        setRefused(NO_AIRPLAY)

        return
      }

      // The screen in the room reads the recording itself, so the element is
      // pointed at the path that answers a byte range before the picker opens.
      element.src = href
      picker.call(element)
    } finally {
      setTaking(null)
    }
  }

  return (
    <div className={cn('flex flex-col items-end gap-1.5', className)}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => take('external')}
          aria-disabled={taking !== null}
          className={PLAYER_BUTTON}
        >
          {taking === 'external' && (
            <Spinner className="mr-1.5 inline size-3" />
          )}
          外部プレイヤーで開く
        </button>
        <button
          type="button"
          onClick={() => take('airplay')}
          aria-disabled={taking !== null}
          className={PLAYER_BUTTON}
        >
          {taking === 'airplay' && <Spinner className="mr-1.5 inline size-3" />}
          AirPlay
        </button>
      </div>
      {refused && (
        <p role="status" className="text-[11px] text-[#EC9A93]">
          {refused}
        </p>
      )}
    </div>
  )
}
