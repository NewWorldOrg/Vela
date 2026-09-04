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
 *
 * They are drawn in two different places because they are two different kinds
 * of thing (v3.35). AirPlay is a player control: every player that offers it
 * — Safari's own `<video>` chrome, YouTube's Cast, Netflix, Disney+ — puts it
 * in the control bar, and it hands over the element that is playing. Opening
 * the file in something else is not a control on this picture at all; it is
 * something done with the recording, and it stands with 削除.
 */
type Picker = { webkitShowPlaybackTargetPicker?: () => void }

const NO_AIRPLAY = 'このブラウザは AirPlay に対応していません。'

function ticketed(id: string, inTheClear: string) {
  const url = new URL(videoFileHref(id), window.location.href)
  url.username = 'ticket'
  url.password = inTheClear

  return url.toString()
}

/** Take a ticket, or the message saying why none was given. */
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

/**
 * Where the button is standing. On the dark plate that replaces the picture it
 * is drawn in the player's own colours; on the page it is an ordinary control
 * and takes the page's tokens, where a white hairline on white would be no
 * button at all.
 */
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

/**
 * The picker, on the bar.
 *
 * It points the element at the path that answers a byte range before opening —
 * the screen in the room reads the recording itself, and what is on the page
 * may be a picture being built as it plays, which nothing else can pick up.
 *
 * A browser without the picker says so where it was pressed rather than
 * anywhere else on the page: the answer belongs beside the question, and this
 * one is only ever asked here.
 */
export function AirPlayButton({
  id,
  onTakeTicket,
  video,
  onRefused,
}: {
  id: string
  onTakeTicket: (id: string) => Promise<TicketWrite>
  /** The element AirPlay hands over. */
  video: RefObject<HTMLVideoElement | null>
  /** Said on the picture, where the bar has no room for a sentence. */
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
      title="AirPlay"
      className={PLAYER_GLYPH_BUTTON}
    >
      {taking ? <Spinner className="size-5" /> : <AirPlayIcon />}
    </button>
  )
}
