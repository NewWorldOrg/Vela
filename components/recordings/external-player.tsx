'use client'

import { useState, type ComponentProps, type RefObject } from 'react'

import { signedOut } from '@/lib/signed-out'
import { cn } from '@/lib/utils'
import {
  recordingHandover,
  recordingHandoverChoices,
  ticketedHref,
  type Handover,
  type HandoverChoice,
} from '@/lib/external-player'
import type { TicketWrite } from '@/repository/tickets'
import type { PlaybackPlan } from '@/repository/videos'
import { Spinner } from '@/components/vela/progress'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AirPlayIcon,
  ChevronDownIcon,
  DevicePlayerIcon,
} from '@/components/vela/icons'
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

const OPEN_EXTERNALLY = '外部プレイヤーで開く'

function useHandingOver() {
  const [taking, setTaking] = useState(false)
  const [refused, setRefused] = useState<string | null>(null)

  const open = async (handover: Handover) => {
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

  return { taking, refused, open }
}

function Refused({
  said,
  tone,
}: {
  said: string | null
  tone: 'page' | 'player'
}) {
  if (!said) {
    return null
  }

  return (
    <p
      role="status"
      className={cn(
        'text-cap',
        tone === 'player' ? 'text-(--pl-err)' : 'text-coral',
      )}
    >
      {said}
    </p>
  )
}

function OpenButton({
  tone,
  taking,
  choosing,
  ...pressed
}: ComponentProps<'button'> & {
  tone: 'page' | 'player'
  taking: boolean
  choosing?: boolean
}) {
  if (tone === 'player') {
    return (
      <button
        type="button"
        aria-disabled={taking}
        className={PLAYER_BUTTON}
        {...pressed}
      >
        {taking && <Spinner size="control" className="mr-1.5 inline" />}
        {OPEN_EXTERNALLY}
        {choosing && <ChevronDownIcon className="ml-1 inline size-3.5" />}
      </button>
    )
  }

  return (
    <Button variant="watch" aria-disabled={taking} {...pressed}>
      {taking ? <Spinner size="control" /> : <DevicePlayerIcon />}
      {OPEN_EXTERNALLY}
      {choosing && <ChevronDownIcon className="size-3.5" />}
    </Button>
  )
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
  const { taking, refused, open } = useHandingOver()

  return (
    <div className={cn('flex flex-col items-start gap-1.5', className)}>
      <OpenButton tone={tone} taking={taking} onClick={() => open(handover)} />
      <Refused said={refused} tone={tone} />
    </div>
  )
}

function OpenExternallyFrom({
  choices,
  tone = 'page',
  className,
}: {
  choices: HandoverChoice[]
  tone?: 'page' | 'player'
  className?: string
}) {
  const { taking, refused, open } = useHandingOver()

  return (
    <div className={cn('flex flex-col items-start gap-1.5', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <OpenButton tone={tone} taking={taking} choosing />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          aria-label={OPEN_EXTERNALLY}
          className="min-w-(--radix-dropdown-menu-trigger-width)"
        >
          {choices.map((choice) => (
            <DropdownMenuItem
              key={choice.source}
              onSelect={() => void open(choice.handover)}
              className="justify-between gap-6"
            >
              <span>{choice.label}</span>
              {choice.size && (
                <span className="text-note text-ink-3 tabular-nums">
                  {choice.size}
                </span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Refused said={refused} tone={tone} />
    </div>
  )
}

export function ExternalPlayerOpener({
  recording,
  plan,
  onTakeTicket,
  tone,
}: {
  recording: { id: string; sizeBytes?: number | null }
  plan: Pick<PlaybackPlan, 'source' | 'alternative'>
  onTakeTicket: (id: string) => Promise<TicketWrite>
  tone?: 'page' | 'player'
}) {
  const choices = recordingHandoverChoices(
    recording.id,
    onTakeTicket,
    plan,
    recording.sizeBytes,
  )

  if (choices.length === 0) {
    return (
      <OpenExternally
        handover={recordingHandover(recording.id, onTakeTicket)}
        tone={tone}
      />
    )
  }

  return <OpenExternallyFrom choices={choices} tone={tone} />
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
      {taking ? <Spinner size="control" /> : <AirPlayIcon />}
    </button>
  )
}
