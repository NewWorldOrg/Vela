'use client'

import { useState, type RefObject } from 'react'

import { signedOut } from '@/lib/signed-out'
import { cn } from '@/lib/utils'
import { ticketedHref, type Handover } from '@/lib/external-player'
import { Spinner } from '@/components/vela/progress'
import { Button } from '@/components/ui/button'
import { AirPlayIcon, DevicePlayerIcon } from '@/components/vela/icons'
import {
  PLAYER_BUTTON,
  PLAYER_GLYPH_BUTTON,
} from '@/components/recordings/player-palette'

type Picker = { webkitShowPlaybackTargetPicker?: () => void }

const NO_AIRPLAY = 'このブラウザは AirPlay に対応していません。'

const SIGNED_OUT = signedOut('外部プレイヤーの札を発行')

async function ticket(
  handover: Handover,
): Promise<{ href: string } | { refused: string }> {
  const write = await handover.take()

  if (write.state === 'unauthenticated') {
    return { refused: SIGNED_OUT }
  }

  if (write.state === 'refused') {
    return { refused: write.message }
  }

  return {
    href: ticketedHref(handover, window.location.href, write.ticket.inTheClear),
  }
}

export function OpenExternally({
  handover,
  tone = 'page',
  className,
}: {
  handover: Handover
  tone?: 'page' | 'player'
  className?: string
}) {
  const [taking, setTaking] = useState(false)
  const [refused, setRefused] = useState<string | null>(null)

  const open = async () => {
    setRefused(null)
    setTaking(true)

    try {
      const got = await ticket(handover)

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
          {taking ? <Spinner className="size-3.5" /> : <DevicePlayerIcon />}
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
  handover,
  video,
  onRefused,
}: {
  handover: Handover
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

      const got = await ticket(handover)

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
