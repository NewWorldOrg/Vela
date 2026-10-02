'use client'

import { useState, type ComponentProps, type RefObject } from 'react'

import { signedOut } from '@/lib/signed-out'
import { cn } from '@/lib/utils'
import {
  appHref,
  appSays,
  recordingHandover,
  recordingHandoverChoices,
  ticketedHref,
  type Handover,
  type HandoverChoice,
  type PlayerApp,
} from '@/lib/external-player'
import { usePlayerApps } from '@/hooks/usePlayerApps'
import type { TicketWrite } from '@/repository/tickets'
import type { PlaybackPlan } from '@/repository/videos'
import { Spinner } from '@/components/vela/progress'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
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

type Taken = { href: string } | { refused: string }

async function ticket(handover: Handover): Promise<Taken> {
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

const WHAT_IS_HANDED = '渡すもの'

const COPY_THE_URL = 'URL をコピー'

const COPIED = 'URL をコピーしました'

const NOT_COPIED = 'URL をコピーできません'

async function asText(taking: Promise<Taken>): Promise<Blob> {
  const got = await taking

  if ('refused' in got) {
    throw new Error(got.refused)
  }

  return new Blob([got.href], { type: 'text/plain' })
}

async function copied(taking: Promise<Taken>): Promise<boolean> {
  try {
    if (typeof ClipboardItem === 'function') {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/plain': asText(taking) }),
      ])

      return true
    }

    const got = await taking

    if ('refused' in got) {
      return false
    }

    await navigator.clipboard.writeText(got.href)

    return true
  } catch {
    return false
  }
}

type Said = { tone: 'done' | 'failed'; text: string }

function useHandingOver() {
  const [taking, setTaking] = useState(false)
  const [said, setSaid] = useState<Said | null>(null)

  const handing = async (
    handover: Handover,
    pass: (taking: Promise<Taken>) => Promise<Said | null>,
  ) => {
    setSaid(null)
    setTaking(true)

    try {
      const asked = ticket(handover)
      const passed = await pass(asked)
      const got = await asked

      setSaid('refused' in got ? { tone: 'failed', text: got.refused } : passed)
    } finally {
      setTaking(false)
    }
  }

  const open = (app: PlayerApp, handover: Handover) =>
    handing(handover, async (asked) => {
      const got = await asked

      if ('href' in got) {
        window.location.assign(appHref(app, got.href))
      }

      return null
    })

  const copy = (handover: Handover) =>
    handing(handover, async (asked) =>
      (await copied(asked))
        ? { tone: 'done', text: COPIED }
        : { tone: 'failed', text: NOT_COPIED },
    )

  return { taking, said, open, copy }
}

function WhatHappened({
  said,
  tone,
}: {
  said: Said | null
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
        said.tone === 'done'
          ? tone === 'player'
            ? 'text-(--pl-ink-2)'
            : 'text-ink-2'
          : tone === 'player'
            ? 'text-(--pl-err)'
            : 'text-coral',
      )}
    >
      {said.text}
    </p>
  )
}

function OpenButton({
  tone,
  taking,
  ...pressed
}: ComponentProps<'button'> & {
  tone: 'page' | 'player'
  taking: boolean
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
        <ChevronDownIcon className="ml-1 inline size-3.5" />
      </button>
    )
  }

  return (
    <Button variant="watch" aria-disabled={taking} {...pressed}>
      {taking ? <Spinner size="control" /> : <DevicePlayerIcon />}
      {OPEN_EXTERNALLY}
      <ChevronDownIcon className="size-3.5" />
    </Button>
  )
}

function HandoverMenu({
  choices,
  only,
  tone = 'page',
  className,
}: {
  choices: HandoverChoice[]
  only: Handover
  tone?: 'page' | 'player'
  className?: string
}) {
  const apps = usePlayerApps()
  const { taking, said, open, copy } = useHandingOver()
  const [picked, setPicked] = useState<string | undefined>(choices[0]?.source)
  const chosen = choices.find((one) => one.source === picked) ?? choices[0]
  const handover = chosen?.handover ?? only
  const inset = chosen ? true : undefined

  return (
    <div className={cn('flex flex-col items-start gap-1.5', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <OpenButton tone={tone} taking={taking} />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          aria-label={OPEN_EXTERNALLY}
          className="min-w-(--radix-dropdown-menu-trigger-width)"
        >
          {chosen && (
            <>
              <DropdownMenuRadioGroup
                aria-label={WHAT_IS_HANDED}
                value={chosen.source}
                onValueChange={setPicked}
              >
                {choices.map((choice) => (
                  <DropdownMenuRadioItem
                    key={choice.source}
                    value={choice.source}
                    onSelect={(pressed) => pressed.preventDefault()}
                    className="justify-between gap-6"
                  >
                    <span>{choice.label}</span>
                    {choice.size && (
                      <span className="text-note text-ink-3 tabular-nums">
                        {choice.size}
                      </span>
                    )}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
            </>
          )}
          {apps.map((app) => (
            <DropdownMenuItem
              key={app}
              inset={inset}
              onSelect={() => void open(app, handover)}
            >
              {appSays(app)}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem inset={inset} onSelect={() => void copy(handover)}>
            {COPY_THE_URL}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <WhatHappened said={said} tone={tone} />
    </div>
  )
}

const NOTHING_TO_CHOOSE: HandoverChoice[] = []

export function OpenExternally({
  handover,
  tone,
  className,
}: {
  handover: Handover
  tone?: 'page' | 'player'
  className?: string
}) {
  return (
    <HandoverMenu
      choices={NOTHING_TO_CHOOSE}
      only={handover}
      tone={tone}
      className={className}
    />
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

  return (
    <HandoverMenu
      choices={choices}
      only={recordingHandover(recording.id, onTakeTicket)}
      tone={tone}
    />
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
      {taking ? <Spinner size="control" /> : <AirPlayIcon />}
    </button>
  )
}
