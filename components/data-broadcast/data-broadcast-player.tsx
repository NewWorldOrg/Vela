'use client'

import {
  useEffect,
  useEffectEvent,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

import type { BmlKey } from '@/lib/bml/keys'
import { moduleToHand, type BmlModule } from '@/lib/bml/resources'
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
import { pressable } from '@/components/vela/tactile'

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

function hand(send: SendToRuntime, module: BmlModule): void {
  const handed = moduleToHand(module)

  send({ kind: 'module', module: handed.module }, handed.transfer)
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

    feed.forTheCatalog.forEach((module) => hand(send, module))
    send({ kind: 'open' })
    onRuntime(send)
    letGo.current = feed.subscribe((change) => {
      if (change.kind === 'catalog') {
        send({ kind: 'catalog', catalog: change.catalog })
      } else if (change.kind === 'module') {
        hand(send, change.module)
      }
    })
  }

  return (
    <>
      <BmlFrame onReady={ready} onMessage={onMessage} className="z-[1]" />
      <p
        role="status"
        data-slot="data-broadcast-says"
        className="pointer-events-none absolute inset-x-0 bottom-[30%] z-[2] flex justify-center"
      >
        {says && (
          <span className="max-w-[88%] rounded-full border border-white/25 bg-black/80 px-4 py-2 text-center text-ui font-medium text-(--pl-ink)">
            {says}
          </span>
        )}
      </p>
    </>
  )
}

type Layout = 'panel' | 'column'

/** The height the keypad's panel adds under the player's box: its keys, 140px for the disc, and 12px above and below. Its keys take a fixed 382px across, so the panel keeps its size when it turns to the numbers. */
export const KEYPAD_PANEL_HEIGHT = 164

/** The player's column while the panel is under it: the window holds the picture and the panel together, 210px and the panel's 164px. */
export const PLAYER_COLUMN_OVER_THE_KEYPAD =
  'max-w-[calc((100dvh_-_374px)*16/9)]'

const KEY_SHAPE = cn(
  'flex h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 px-3 text-sub font-bold text-(--pl-ink) select-none hover:bg-white/20 focus-visible:shadow-ring focus-visible:outline-none active:translate-x-px active:translate-y-px active:bg-white/25',
  'transition-[translate,background-color] duration-150 ease-toy',
  pressable,
)

const ENTER_LOOK =
  'border-transparent bg-(--pl-accent) text-(--pl-bg) hover:bg-(--pl-accent-ink) active:bg-(--pl-accent)'

type Way = 'up' | 'down' | 'left' | 'right'

const WEDGES: { way: Way; name: string; shift: string; glyph: ReactNode }[] = [
  {
    way: 'up',
    name: '上',
    shift: '0px, -48px',
    glyph: <ChevronUpIcon className="size-[22px]" />,
  },
  {
    way: 'right',
    name: '右',
    shift: '48px, 0px',
    glyph: <ChevronRightIcon className="size-[22px]" />,
  },
  {
    way: 'down',
    name: '下',
    shift: '0px, 48px',
    glyph: <ChevronDownIcon className="size-[22px]" />,
  },
  {
    way: 'left',
    name: '左',
    shift: '-48px, 0px',
    glyph: <ChevronLeftIcon className="size-[22px]" />,
  },
]

const COLOURS: { key: BmlKey; name: string; fill: string }[] = [
  {
    key: 'blue',
    name: '青',
    fill: 'bg-(--remote-blue) hover:bg-(--remote-blue) active:bg-(--remote-blue)',
  },
  {
    key: 'red',
    name: '赤',
    fill: 'bg-(--remote-red) hover:bg-(--remote-red) active:bg-(--remote-red)',
  },
  {
    key: 'green',
    name: '緑',
    fill: 'bg-(--remote-green) hover:bg-(--remote-green) active:bg-(--remote-green)',
  },
  {
    key: 'yellow',
    name: '黄',
    fill: 'bg-(--remote-yellow) hover:bg-(--remote-yellow) active:bg-(--remote-yellow)',
  },
]

interface Pressing {
  onKey: (key: BmlKey) => void
  onAim: () => void
}

function KeyButton({
  name,
  pressing,
  onPress,
  className,
  children,
}: {
  name: string
  pressing: Pressing
  onPress: () => void
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
      className={cn(KEY_SHAPE, className)}
    >
      {children}
    </button>
  )
}

/** The cross as a remote control draws it: one disc split into four wedges on its diagonals, each a press of its own, with Enter at its heart. */
function Disc({ pressing }: { pressing: Pressing }) {
  return (
    <div className="relative size-[140px] shrink-0 overflow-hidden rounded-full bg-white/8 ring-1 ring-white/22 ring-inset">
      {WEDGES.map((wedge) => (
        <button
          key={wedge.way}
          type="button"
          aria-label={wedge.name}
          onMouseDown={(event) => {
            event.preventDefault()
            pressing.onAim()
          }}
          onClick={() => pressing.onKey(wedge.way)}
          style={{
            transform: `translate(-50%, -50%) translate(${wedge.shift}) rotate(45deg)`,
          }}
          className={cn(
            'absolute top-1/2 left-1/2 flex size-[71px] items-center justify-center text-(--pl-ink) transition-colors duration-150 ease-out select-none hover:bg-white/8 focus-visible:bg-white/16 focus-visible:outline-none active:bg-white/16 [&_svg]:transition-transform active:[&_svg]:translate-y-px',
            pressable,
          )}
        >
          <span className="-rotate-45">{wedge.glyph}</span>
        </button>
      ))}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-px w-[200px] -translate-1/2 rotate-45 bg-white/14"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-px w-[200px] -translate-1/2 -rotate-45 bg-white/14"
      />
      <button
        type="button"
        aria-label="決定"
        onMouseDown={(event) => {
          event.preventDefault()
          pressing.onAim()
        }}
        onClick={() => pressing.onKey('enter')}
        className={cn(
          'absolute top-1/2 left-1/2 z-[1] flex size-[52px] -translate-1/2 items-center justify-center rounded-full text-sub font-bold transition-[translate,background-color] duration-150 ease-toy select-none focus-visible:shadow-ring focus-visible:outline-none active:translate-[calc(-50%+1px)]',
          ENTER_LOOK,
          pressable,
        )}
      >
        決定
      </button>
    </div>
  )
}

function Colours({ pressing }: { pressing: Pressing }) {
  return (
    <div className="grid shrink-0 grid-cols-2 gap-[8px]">
      {COLOURS.map((colour) => (
        <KeyButton
          key={colour.key}
          name={colour.name}
          pressing={pressing}
          onPress={() => pressing.onKey(colour.key)}
          className={cn('size-[44px] px-0', colour.fill)}
        />
      ))}
    </div>
  )
}

function Digit({ digit, pressing }: { digit: BmlKey; pressing: Pressing }) {
  return (
    <KeyButton
      name={digit}
      pressing={pressing}
      onPress={() => pressing.onKey(digit)}
      className="size-[44px] px-0 font-code"
    >
      {digit}
    </KeyButton>
  )
}

/** The numbers: in the panel three rows of four, 1 to 9 with `←`, `0` and Enter down the right, so the panel keeps its size; in the column four rows of three, as a telephone has them. */
function Numbers({
  layout,
  pressing,
  back,
}: {
  layout: Layout
  pressing: Pressing
  back: ReactNode
}) {
  const enter = (
    <KeyButton
      name="決定"
      pressing={pressing}
      onPress={() => pressing.onKey('enter')}
      className={cn('size-[44px] px-0', ENTER_LOOK)}
    >
      決定
    </KeyButton>
  )
  const digit = (value: BmlKey) => (
    <Digit key={value} digit={value} pressing={pressing} />
  )

  if (layout === 'column') {
    return (
      <div className="grid grid-cols-3 gap-[8px]">
        {(['1', '2', '3', '4', '5', '6', '7', '8', '9'] as BmlKey[]).map(digit)}
        {back}
        {digit('0')}
        {enter}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-x-[8px] gap-y-[4px]">
      {(['1', '2', '3'] as BmlKey[]).map(digit)}
      {back}
      {(['4', '5', '6'] as BmlKey[]).map(digit)}
      {digit('0')}
      {(['7', '8', '9'] as BmlKey[]).map(digit)}
      {enter}
    </div>
  )
}

const LAYOUT: Record<Layout, string> = {
  panel:
    'relative mx-auto -mt-px w-max rounded-b-xl border border-t-0 border-line-strong bg-(--pl-bg) px-[16px] py-[12px] shadow-pop-xl',
  column:
    'absolute inset-y-0 right-0 z-10 flex w-[170px] flex-col items-center justify-center-safe gap-[14px] overflow-y-auto bg-[rgba(6,5,9,0.6)] pt-[12px] pb-[60px] *:shrink-0',
}

/** The remote control's keys on screen: a black panel of its own width joined under the player's box, or the same keys down a column at the right in fullscreen. `123` turns it to the numbers, and `←` back; the key pressed to turn it goes away with its face, so the focus is handed back to the player first. */
export function DataBroadcastKeypad({
  layout,
  numbers,
  onNumbers,
  onKey,
  onAim,
  onKeyDown,
}: {
  layout: Layout
  numbers: boolean
  onNumbers: (shown: boolean) => void
  onKey: (key: BmlKey) => void
  onAim: () => void
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void
}) {
  const pressing: Pressing = { onKey, onAim }
  const turn = (shown: boolean) => {
    onAim()
    onNumbers(shown)
  }
  const back = (
    <KeyButton
      name="戻る"
      pressing={pressing}
      onPress={() => onKey('back')}
      className="w-[52px] px-0"
    >
      戻る
    </KeyButton>
  )
  const toNumbers = (
    <KeyButton
      name="123 数字"
      pressing={pressing}
      onPress={() => turn(true)}
      className="w-[52px] px-0 font-code"
    >
      123
    </KeyButton>
  )
  const fromNumbers = (
    <KeyButton
      name="数字を閉じる"
      pressing={pressing}
      onPress={() => turn(false)}
      className="size-[44px] px-0"
    >
      <ChevronLeftIcon className="size-5" />
    </KeyButton>
  )
  const keys =
    layout === 'panel' ? (
      <div className="flex items-center gap-[14px]">
        {back}
        <Disc pressing={pressing} />
        <Colours pressing={pressing} />
        {toNumbers}
      </div>
    ) : (
      <>
        <Disc pressing={pressing} />
        <Colours pressing={pressing} />
        <div className="flex gap-[10px]">
          {back}
          {toNumbers}
        </div>
      </>
    )
  const digits = (
    <Numbers layout={layout} pressing={pressing} back={fromNumbers} />
  )

  return (
    <div
      role="group"
      aria-label={KEYPAD_NAME}
      data-slot="data-broadcast-keypad"
      data-layout={layout}
      data-face={numbers ? 'numbers' : 'keys'}
      onKeyDown={onKeyDown}
      className={LAYOUT[layout]}
    >
      {layout === 'panel' ? (
        <div className="flex h-[140px] w-[382px] items-center justify-center">
          {numbers ? digits : keys}
        </div>
      ) : (
        <>{numbers ? digits : keys}</>
      )}
    </div>
  )
}
