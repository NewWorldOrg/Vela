'use client'

import { useState, type ComponentProps } from 'react'

import { cn } from '@/lib/utils'
import {
  appSays,
  type Handover,
  type HandoverChoice,
} from '@/lib/external-player'
import { usePlayerApps } from '@/hooks/usePlayerApps'
import { Spinner } from '@/components/vela/spinner'
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
import { ChevronDownIcon, DevicePlayerIcon } from '@/components/vela/icons'
import { PLAYER_BUTTON } from '@/components/recordings/player-palette'
import {
  useHandingOver,
  WHAT_IS_HANDED,
  COPY_THE_URL,
} from '@/components/recordings/handing-over'
import { WhatHappened } from '@/components/recordings/what-happened'

const OPEN_EXTERNALLY = '外部プレイヤーで再生'

export type OpenLook = 'tone' | 'play'

function OpenButton({
  tone,
  look,
  taking,
  wide,
  ...pressed
}: ComponentProps<'button'> & {
  tone: 'page' | 'player'
  look: OpenLook
  taking: boolean
  wide?: boolean
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

  if (wide) {
    return (
      <Button
        variant={look}
        size="lg"
        aria-disabled={taking}
        className="w-full"
        {...pressed}
      >
        {taking && <Spinner size="control" />}
        {OPEN_EXTERNALLY}
        <ChevronDownIcon className="size-3.5" />
      </Button>
    )
  }

  return (
    <Button variant={look} aria-disabled={taking} {...pressed}>
      {taking ? <Spinner size="control" /> : <DevicePlayerIcon />}
      {OPEN_EXTERNALLY}
      <ChevronDownIcon className="size-3.5" />
    </Button>
  )
}

export function HandoverMenu({
  choices,
  only,
  tone = 'page',
  look = 'tone',
  wide,
  className,
}: {
  choices: HandoverChoice[]
  only: Handover
  tone?: 'page' | 'player'
  /** Grey among other grey buttons, or the green of playing, as the recording's row of actions draws it. */
  look?: OpenLook
  /** The large button as wide as the column it stands in, beside the live programme under the picture. */
  wide?: boolean
  className?: string
}) {
  const apps = usePlayerApps()
  const { taking, said, open, copy } = useHandingOver()
  const [picked, setPicked] = useState<string | undefined>(choices[0]?.source)
  const chosen = choices.find((one) => one.source === picked) ?? choices[0]
  const handover = chosen?.handover ?? only
  const inset = chosen ? true : undefined

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5',
        wide ? 'items-stretch' : 'items-start',
        className,
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <OpenButton tone={tone} look={look} taking={taking} wide={wide} />
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
                      <span className="text-note text-ink-2 tabular-nums">
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
