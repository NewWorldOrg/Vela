'use client'

import { useState, type RefObject } from 'react'

import { type Handover } from '@/lib/external-player'
import { Spinner } from '@/components/vela/spinner'
import { AirPlayIcon } from '@/components/vela/icons'
import { PLAYER_GLYPH_BUTTON } from '@/components/recordings/player-palette'
import { ticket } from '@/components/recordings/handing-over'

type Picker = { webkitShowPlaybackTargetPicker?: () => void }

const NO_AIRPLAY = 'このブラウザーは AirPlay に対応していません。'

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
      {taking ? <Spinner size="control" /> : <AirPlayIcon />}
    </button>
  )
}
