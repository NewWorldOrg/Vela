'use client'

import { useEffect, useEffectEvent, useRef, type ReactNode } from 'react'

import type { BmlKey } from '@/lib/bml/keys'
import type { RuntimeMessage } from '@/lib/bml/messages'
import type { DataBroadcastFeed } from '@/lib/data-broadcast-feed'
import { KEY_CAP } from '@/lib/player-keys'
import { cn } from '@/lib/utils'
import {
  BmlFrame,
  type SendToRuntime,
} from '@/components/data-broadcast/bml-frame'
import { fontsForTheRuntime } from '@/components/data-broadcast/bml-fonts'
import {
  PLAYER_GLYPH_BUTTON,
  PLAYER_GLYPH_BUTTON_ON,
} from '@/components/recordings/player-palette'
import { PlayerTip } from '@/components/recordings/player-tip'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  DataBroadcastIcon,
} from '@/components/vela/icons'
import { pressable, tactile } from '@/components/vela/tactile'

export const DATA_BROADCAST_NAME = 'データ放送'

export const KEYPAD_NAME = 'データ放送のリモコン'

/** The width the keypad's column takes from the right of the screen in fullscreen. */
export const KEYPAD_COLUMN = 'right-[170px]'

/** The control on the player's bar that opens and closes the data broadcast. */
export function DataBroadcastToggle({
  open,
  onToggle,
  container,
}: {
  open: boolean
  onToggle: () => void
  container: HTMLElement | null
}) {
  return (
    <PlayerTip
      name={DATA_BROADCAST_NAME}
      keys={[KEY_CAP.dataBroadcast]}
      container={container}
    >
      <button
        type="button"
        aria-label={DATA_BROADCAST_NAME}
        aria-pressed={open}
        onClick={onToggle}
        className={cn(PLAYER_GLYPH_BUTTON, open && PLAYER_GLYPH_BUTTON_ON)}
      >
        <DataBroadcastIcon />
      </button>
    </PlayerTip>
  )
}

/** The broadcast's face over the player's 16:9 box: the runtime's frame, handed the fonts, the catalog and the modules when it loads and every change after, and the one line said at its bottom. */
export function DataBroadcastFace({
  feed,
  onRuntime,
  onMessage,
  says,
}: {
  feed: DataBroadcastFeed
  onRuntime: (send: SendToRuntime | null) => void
  onMessage: (message: RuntimeMessage) => void
  says: string | null
}) {
  const alive = useRef(false)
  const letGo = useRef<(() => void) | null>(null)
  const gone = useEffectEvent(() => onRuntime(null))

  useEffect(() => {
    alive.current = true

    return () => {
      alive.current = false
      letGo.current?.()
      letGo.current = null
      gone()
    }
  }, [])

  const ready = async (send: SendToRuntime) => {
    const fonts = await fontsForTheRuntime()

    if (!alive.current) {
      return
    }

    send(
      { kind: 'font', fonts },
      fonts.map((font) => font.bytes),
    )

    const catalog = feed.catalog

    if (catalog) {
      send({ kind: 'catalog', catalog })
    }

    feed.heldModules.forEach((module) => send({ kind: 'module', module }))
    send({ kind: 'open' })
    onRuntime(send)
    letGo.current = feed.subscribe((change) => {
      if (change.kind === 'catalog') {
        send({ kind: 'catalog', catalog: change.catalog })
      } else if (change.kind === 'module') {
        send({ kind: 'module', module: change.module })
      }
    })
  }

  return (
    <>
      <BmlFrame onReady={ready} onMessage={onMessage} className="z-[1]" />
      {says && (
        <p
          role="status"
          data-slot="data-broadcast-says"
          className="pointer-events-none absolute inset-x-0 bottom-[30%] z-[2] mx-auto w-fit max-w-[88%] rounded-full border border-white/25 bg-black/80 px-4 py-2 text-center text-ui font-medium text-(--pl-ink)"
        >
          {says}
        </p>
      )}
    </>
  )
}

type Layout = 'band' | 'column'

const KEY_LOOK: Record<Layout, string> = {
  band: 'border-edge bg-surface text-ink-2 shadow-pop hover:bg-surface-2 hover:shadow-pop-lg active:shadow-pop-none',
  column:
    'border-white/30 bg-white/10 text-(--pl-ink) hover:bg-white/20 active:bg-white/25',
}

const KEY_SHAPE = cn(
  'flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border font-bold text-sub select-none focus-visible:shadow-ring focus-visible:outline-none',
  tactile,
  pressable,
)

const ENTER_LOOK: Record<Layout, string> = {
  band: 'border-transparent bg-btn-fill text-on-btn shadow-pop hover:bg-btn-fill-hover hover:shadow-pop-lg active:shadow-pop-none',
  column: 'border-transparent bg-btn-fill text-on-btn hover:bg-btn-fill-hover',
}

const ARROWS: Record<
  'up' | 'down' | 'left' | 'right',
  { name: string; glyph: ReactNode }
> = {
  up: { name: '上', glyph: <ChevronUpIcon className="size-5" /> },
  down: { name: '下', glyph: <ChevronDownIcon className="size-5" /> },
  left: { name: '左', glyph: <ChevronLeftIcon className="size-5" /> },
  right: { name: '右', glyph: <ChevronRightIcon className="size-5" /> },
}

const COLOURS: { key: BmlKey; name: string; fill: string }[] = [
  { key: 'blue', name: '青', fill: 'bg-(--remote-blue)' },
  { key: 'red', name: '赤', fill: 'bg-(--remote-red)' },
  { key: 'green', name: '緑', fill: 'bg-(--remote-green)' },
  { key: 'yellow', name: '黄', fill: 'bg-(--remote-yellow)' },
]

const COLOUR_LOOK: Record<Layout, string> = {
  band: 'border-black/20 shadow-pop hover:shadow-pop-lg active:shadow-pop-none',
  column: 'border-white/30',
}

const DIGITS: BmlKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

interface Pressing {
  layout: Layout
  onKey: (key: BmlKey) => void
  onAim: () => void
}

function KeyButton({
  name,
  pressing,
  onPress,
  look,
  className,
  children,
}: {
  name: string
  pressing: Pressing
  onPress: () => void
  look?: string
  className?: string
  children?: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={name}
      onMouseDown={(event) => {
        event.preventDefault()
        pressing.onAim()
      }}
      onClick={onPress}
      className={cn(KEY_SHAPE, look ?? KEY_LOOK[pressing.layout], className)}
    >
      {children}
    </button>
  )
}

function Arrow({
  way,
  pressing,
  className,
}: {
  way: keyof typeof ARROWS
  pressing: Pressing
  className?: string
}) {
  return (
    <KeyButton
      name={ARROWS[way].name}
      pressing={pressing}
      onPress={() => pressing.onKey(way)}
      className={cn('size-11', className)}
    >
      {ARROWS[way].glyph}
    </KeyButton>
  )
}

function Enter({
  pressing,
  className,
}: {
  pressing: Pressing
  className?: string
}) {
  return (
    <KeyButton
      name="決定"
      pressing={pressing}
      onPress={() => pressing.onKey('enter')}
      look={ENTER_LOOK[pressing.layout]}
      className={className}
    >
      決定
    </KeyButton>
  )
}

/** The arrows and Enter: a cross with Enter at its heart in the column, and in the band, which has no room for three rows of 44px, the arrows as an inverted T with Enter beside them. */
function Dpad({ pressing }: { pressing: Pressing }) {
  if (pressing.layout === 'column') {
    return (
      <div className="grid shrink-0 grid-cols-3 gap-1.5">
        <Arrow way="up" pressing={pressing} className="col-start-2" />
        <Arrow way="left" pressing={pressing} className="col-start-1" />
        <Enter pressing={pressing} className="size-11" />
        <Arrow way="right" pressing={pressing} />
        <Arrow way="down" pressing={pressing} className="col-start-2" />
      </div>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <div className="grid grid-cols-3 gap-1">
        <Arrow way="up" pressing={pressing} className="col-start-2" />
        <Arrow way="left" pressing={pressing} className="col-start-1" />
        <Arrow way="down" pressing={pressing} />
        <Arrow way="right" pressing={pressing} />
      </div>
      <Enter pressing={pressing} className="px-4" />
    </div>
  )
}

function Colours({ pressing }: { pressing: Pressing }) {
  return (
    <div className="grid shrink-0 grid-cols-2 gap-1.5">
      {COLOURS.map((colour) => (
        <KeyButton
          key={colour.key}
          name={colour.name}
          pressing={pressing}
          onPress={() => pressing.onKey(colour.key)}
          look={cn(COLOUR_LOOK[pressing.layout], colour.fill)}
          className="size-11"
        />
      ))}
    </div>
  )
}

function Digits({ pressing }: { pressing: Pressing }) {
  return (
    <div className="grid shrink-0 grid-cols-5 gap-1.5">
      {DIGITS.map((digit) => (
        <KeyButton
          key={digit}
          name={digit}
          pressing={pressing}
          onPress={() => pressing.onKey(digit)}
          className="size-11 font-code"
        >
          {digit}
        </KeyButton>
      ))}
    </div>
  )
}

const LAYOUT: Record<Layout, string> = {
  band: 'flex h-[120px] w-max min-w-full items-center justify-center gap-[22px] px-4 @max-[600px]:gap-3 @max-[600px]:px-3',
  column:
    'absolute inset-y-0 right-0 z-10 flex w-[170px] flex-col items-center justify-center gap-3.5 pb-[60px]',
}

/** The remote control's keys on screen: a band under the player's box, or a column at the right in fullscreen. `123` turns it to the numbers, and `←` back; the key pressed to turn it goes away with its face, so the focus is handed back to the player first. */
export function DataBroadcastKeypad({
  layout,
  numbers,
  onNumbers,
  onKey,
  onAim,
}: {
  layout: Layout
  numbers: boolean
  onNumbers: (shown: boolean) => void
  onKey: (key: BmlKey) => void
  onAim: () => void
}) {
  const pressing: Pressing = { layout, onKey, onAim }
  const turn = (shown: boolean) => {
    onAim()
    onNumbers(shown)
  }
  const back = (
    <KeyButton
      name="戻る"
      pressing={pressing}
      onPress={() => onKey('back')}
      className="px-4"
    >
      戻る
    </KeyButton>
  )
  const toNumbers = (
    <KeyButton
      name="数字"
      pressing={pressing}
      onPress={() => turn(true)}
      className="px-4 font-code"
    >
      123
    </KeyButton>
  )
  const fromNumbers = (
    <KeyButton
      name="数字を閉じる"
      pressing={pressing}
      onPress={() => turn(false)}
      className="size-11"
    >
      <ChevronLeftIcon className="size-5" />
    </KeyButton>
  )
  const enter = (
    <Enter
      pressing={pressing}
      className={layout === 'band' ? 'px-4' : 'size-11'}
    />
  )

  const face = numbers ? (
    <NumbersFace
      layout={layout}
      pressing={pressing}
      back={fromNumbers}
      enter={enter}
    />
  ) : (
    <KeysFace layout={layout} pressing={pressing} back={back}>
      {toNumbers}
    </KeysFace>
  )

  return (
    <div
      role="group"
      aria-label={KEYPAD_NAME}
      data-slot="data-broadcast-keypad"
      data-layout={layout}
      data-face={numbers ? 'numbers' : 'keys'}
      className={
        layout === 'band'
          ? '@container h-[120px] shrink-0 overflow-x-auto border-t border-line bg-surface'
          : LAYOUT.column
      }
    >
      {layout === 'band' ? <div className={LAYOUT.band}>{face}</div> : face}
    </div>
  )
}

function KeysFace({
  layout,
  pressing,
  back,
  children,
}: {
  layout: Layout
  pressing: Pressing
  back: ReactNode
  children: ReactNode
}) {
  if (layout === 'column') {
    return (
      <>
        <Dpad pressing={pressing} />
        <Colours pressing={pressing} />
        <div className="flex gap-2.5">
          {back}
          {children}
        </div>
      </>
    )
  }

  return (
    <>
      {back}
      <Dpad pressing={pressing} />
      <Colours pressing={pressing} />
      {children}
    </>
  )
}

function NumbersFace({
  layout,
  pressing,
  back,
  enter,
}: {
  layout: Layout
  pressing: Pressing
  back: ReactNode
  enter: ReactNode
}) {
  if (layout === 'column') {
    return <ColumnDigits pressing={pressing} back={back} enter={enter} />
  }

  return (
    <>
      {back}
      <Digits pressing={pressing} />
      {enter}
    </>
  )
}

function ColumnDigits({
  pressing,
  back,
  enter,
}: {
  pressing: Pressing
  back: ReactNode
  enter: ReactNode
}) {
  return (
    <div className="grid grid-cols-3 justify-items-center gap-2">
      {DIGITS.slice(0, 9).map((digit) => (
        <KeyButton
          key={digit}
          name={digit}
          pressing={pressing}
          onPress={() => pressing.onKey(digit)}
          className="size-11 font-code"
        >
          {digit}
        </KeyButton>
      ))}
      {back}
      <KeyButton
        name="0"
        pressing={pressing}
        onPress={() => pressing.onKey('0')}
        className="size-11 font-code"
      >
        0
      </KeyButton>
      {enter}
    </div>
  )
}
