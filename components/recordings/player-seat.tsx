'use client'

import { useState, type ComponentProps } from 'react'
import { useRouter } from 'next/navigation'

import { whichArtefactSeats } from '@/lib/playback-source'
import { Player } from '@/components/recordings/player'

/** The player, opened anew on a replaced artefact even when its address has nothing left to change. */
export function PlayerSeat(
  props: Omit<ComponentProps<typeof Player>, 'onOpenAnewWhereItStands'>,
) {
  const router = useRouter()
  const [asked, setAsked] = useState<string>()
  const [seated, setSeated] = useState<string>()
  const seats = whichArtefactSeats(seated, asked, props.artefact)

  if (seats !== seated) {
    setSeated(seats)
  }

  return (
    <Player
      key={seats ?? ''}
      {...props}
      onOpenAnewWhereItStands={(artefact) => {
        setAsked(artefact)

        if (props.artefact !== artefact) {
          router.refresh()
        }
      }}
    />
  )
}
