'use client'

import {
  useEffect,
  useEffectEvent,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react'

import type { BmlCatalog } from '@/lib/bml/catalog'
import type { BmlKey } from '@/lib/bml/keys'
import {
  keepMemory,
  memoryEntriesOf,
  type MemoryStorage,
} from '@/lib/bml/memory'
import type { RuntimeMessage } from '@/lib/bml/messages'
import { moduleToHand, type BmlModule } from '@/lib/bml/resources'
import type { DataBroadcastHeld } from '@/lib/data-broadcast-feed'
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

/** The browser's storage, where a broadcaster's memory is kept between sessions, or null where it cannot be reached. */
function storageOf(): MemoryStorage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** What the player knows of the programme the broadcast belongs to: its network and when it began. */
export interface OnAir {
  network: number | null
  startsAt: number | null
}

const NOTHING_ON_AIR: OnAir = { network: null, startsAt: null }

/** Hands the runtime the catalog, and with it what the player keeps for that broadcaster and the programme on air. */
function catalogued(
  send: SendToRuntime,
  catalog: BmlCatalog,
  onAir: OnAir,
): void {
  const storage = storageOf()

  send({ kind: 'catalog', catalog })
  send({
    kind: 'memory',
    entries: storage ? memoryEntriesOf(storage, catalog.service) : [],
  })
  send({
    kind: 'programme',
    programme: {
      service: catalog.service,
      event: null,
      network: onAir.network,
      stream: null,
      startsAt: onAir.startsAt,
    },
  })
}

/** The broadcast's face over the player's 16:9 box: the runtime's frame, handed the fonts, the catalog and the modules when it loads and every change after, and the one line said at its bottom. What the runtime asks to keep is written to the browser's storage under the broadcaster. */
export function DataBroadcastFace({
  feed,
  onAir = NOTHING_ON_AIR,
  onRuntime,
  onMessage,
  says,
}: {
  feed: DataBroadcastHeld
  onAir?: OnAir
  onRuntime: (send: SendToRuntime | null) => void
  onMessage: (message: RuntimeMessage) => void
  says: string | null
}) {
  const alive = useRef(false)
  const letGo = useRef<(() => void) | null>(null)
  const gone = useEffectEvent(() => onRuntime(null))
  const heard = (message: RuntimeMessage) => {
    const storage = storageOf()
    const service = feed.catalog?.service

    if (message.kind === 'memory' && storage && service !== undefined) {
      keepMemory(storage, service, message.name, message.value)
    }

    onMessage(message)
  }

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
      catalogued(send, catalog, onAir)
    }

    feed.forTheCatalog.forEach((module) => hand(send, module))
    feed.nptReadings.forEach((reading) => send({ kind: 'npt', reading }))
    send({ kind: 'open' })
    onRuntime(send)
    letGo.current = feed.subscribe((change) => {
      if (change.kind === 'catalog') {
        catalogued(send, change.catalog, onAir)
      } else if (change.kind === 'module') {
        hand(send, change.module)
      } else if (change.kind === 'event') {
        send({ kind: 'event', event: change.event })
      } else if (change.kind === 'npt') {
        send({ kind: 'npt', reading: change.reading })
      }
    })
  }

  return (
    <>
      <BmlFrame onReady={ready} onMessage={heard} className="z-[1]" />
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

/** Where the band is pressed: by a mouse (`pointer: fine`), by a finger in the window, or by a finger in fullscreen. */
export type BandFit = 'fine' | 'coarse' | 'coarse-full'

/** Which band the player draws out: a mouse gets the one over the picture, a finger the one under the box, and a finger in fullscreen the one over the picture again, sized for the finger. */
export function bandFit(coarse: boolean, full: boolean): BandFit {
  if (!coarse) {
    return 'fine'
  }

  return full ? 'coarse-full' : 'coarse'
}

/** The width of the mock's player. The band is drawn at the mock's measures there and grows with the player, up to one and a half times the mock. */
export const BAND_MOCK_WIDTH = 1174

export const BAND_MAX_SCALE = 1.5

/** The band under the box, in the finger's window: the keys' row with 12px above and below, at the mock's measures. */
export const BAND_UNDER_THE_BOX = 160

/** The player's column while the band is under its box: the window holds the picture, the 210px around it and the band. */
export const PLAYER_COLUMN_OVER_THE_BAND = 'max-w-[calc((100dvh_-_370px)*16/9)]'

/** One mock pixel, measured against the player's width: the mock's size at its width and below, growing with the player, and no more than one and a half times the mock. */
const UNIT = `clamp(1px, 100cqw / ${BAND_MOCK_WIDTH}, ${BAND_MAX_SCALE}px)`

function mock(px: number): string {
  return `calc(${px} * var(--u))`
}

/** The mock's measures: the band and its scrim, the pills, the disc and its wedges, the arrows, Enter, the colour dots and the digits. */
const MEASURES = {
  '--u': UNIT,
  '--band': mock(136),
  '--scrim': mock(256),
  '--gap': mock(20),
  '--row-gap': mock(12),
  '--pill-h': mock(44),
  '--pill-w': mock(56),
  '--pill-font': mock(13),
  '--disc': mock(136),
  '--wedge': mock(75),
  '--reach': mock(45),
  '--arrow': mock(22),
  '--ok': mock(48),
  '--ok-font': mock(13),
  '--dot': mock(44),
  '--pitch': mock(54),
  '--key': mock(44),
  '--key-pitch': mock(52),
  '--key-font': mock(15),
} as CSSProperties

/** The scrim under the band and the control bar, as the mock lays it: one gradient from the player's bottom up. */
const SCRIM =
  'linear-gradient(to top, rgba(6,5,9,.92) 0%, rgba(6,5,9,.86) 30%, rgba(6,5,9,.8) 62%, rgba(6,5,9,.5) 78%, rgba(6,5,9,.18) 92%, rgba(6,5,9,0) 100%)'

const SINKS =
  'transition-[translate,background-color,border-color,color] duration-150 ease-toy active:translate-x-px active:translate-y-px'

const KEY_LOOK = cn(
  'relative flex shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 font-bold text-(--pl-ink) select-none hover:bg-white/20 focus-visible:shadow-ring focus-visible:outline-none active:bg-white/25',
  SINKS,
  pressable,
)

const PILL = cn(
  KEY_LOOK,
  'h-(--pill-h) w-(--pill-w) text-[length:var(--pill-font)] leading-none after:absolute after:-inset-x-[2px] after:-inset-y-[4px] after:content-[""]',
)

const PILL_ON = 'border-white bg-white/28 text-white hover:bg-white/28'

const ENTER_LOOK = cn(
  'absolute top-1/2 left-1/2 z-[1] flex size-(--ok) -translate-1/2 items-center justify-center rounded-full bg-(--pl-accent) text-[length:var(--ok-font)] leading-none font-bold tracking-[-0.02em] text-(--pl-bg) select-none hover:bg-(--pl-accent-ink) focus-visible:shadow-ring focus-visible:outline-none active:translate-[calc(-50%+1px)] active:bg-(--pl-accent)',
  'transition-[translate,background-color] duration-150 ease-toy',
  pressable,
)

const DIAGONALS =
  'before:absolute before:top-1/2 before:left-1/2 before:h-px before:w-[150%] before:-translate-1/2 before:rotate-45 before:bg-white/16 before:content-[""] after:absolute after:top-1/2 after:left-1/2 after:h-px after:w-[150%] after:-translate-1/2 after:-rotate-45 after:bg-white/16 after:content-[""]'

type Way = 'up' | 'down' | 'left' | 'right'

const WEDGES: { way: Way; name: string; shift: string; glyph: ReactNode }[] = [
  {
    way: 'up',
    name: '上',
    shift: '0, calc(var(--reach) * -1)',
    glyph: <ChevronUpIcon className="size-(--arrow)" />,
  },
  {
    way: 'down',
    name: '下',
    shift: '0, var(--reach)',
    glyph: <ChevronDownIcon className="size-(--arrow)" />,
  },
  {
    way: 'left',
    name: '左',
    shift: 'calc(var(--reach) * -1), 0',
    glyph: <ChevronLeftIcon className="size-(--arrow)" />,
  },
  {
    way: 'right',
    name: '右',
    shift: 'var(--reach), 0',
    glyph: <ChevronRightIcon className="size-(--arrow)" />,
  },
]

const COLOURS: { key: BmlKey; name: string; fill: string }[] = [
  { key: 'blue', name: '青', fill: 'bg-(--remote-blue)' },
  { key: 'red', name: '赤', fill: 'bg-(--remote-red)' },
  { key: 'green', name: '緑', fill: 'bg-(--remote-green)' },
  { key: 'yellow', name: '黄', fill: 'bg-(--remote-yellow)' },
]

const DIGITS: BmlKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

interface Pressing {
  onKey: (key: BmlKey) => void
  onAim: () => void
}

/** A key pressed by the pointer keeps the focus on the player, so the keyboard goes on working after it. */
function aiming(pressing: Pressing) {
  return (event: { preventDefault: () => void }) => {
    event.preventDefault()
    pressing.onAim()
  }
}

/** The cross as a remote control has it: one disc with its two diagonals drawn, the four arrows each a wedge of it and Enter at its heart. The wedges reach past the circle and are clipped by it, so a press anywhere in a quarter is that arrow. */
function Disc({ pressing }: { pressing: Pressing }) {
  return (
    <div
      role="group"
      aria-label="十字"
      data-tap-exempt="a wedge of the disc is the press, as wide as the quarter it fills; the cross through its arrow is narrower than the sector"
      className={cn(
        'relative size-(--disc) shrink-0 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/26 ring-inset',
        DIAGONALS,
      )}
    >
      {WEDGES.map((wedge) => (
        <button
          key={wedge.way}
          type="button"
          aria-label={wedge.name}
          onMouseDown={aiming(pressing)}
          onClick={() => pressing.onKey(wedge.way)}
          style={{
            transform: `translate(-50%, -50%) translate(${wedge.shift}) rotate(45deg)`,
          }}
          className={cn(
            'absolute top-1/2 left-1/2 flex size-(--wedge) items-center justify-center text-(--pl-ink) transition-colors duration-150 ease-out select-none hover:bg-white/8 focus-visible:bg-white/16 focus-visible:outline-none active:bg-white/16 [&_svg]:transition-transform active:[&_svg]:translate-y-px',
            pressable,
          )}
        >
          <span className="block -rotate-45 [&_svg]:stroke-[2]">
            {wedge.glyph}
          </span>
        </button>
      ))}
      <button
        type="button"
        aria-label="決定"
        onMouseDown={aiming(pressing)}
        onClick={() => pressing.onKey('enter')}
        className={ENTER_LOOK}
      >
        決定
      </button>
    </div>
  )
}

/** The four colour keys as the remote has them: a dot of the colour and nothing written on it. The press reaches halfway to the neighbour. */
function Colours({ pressing }: { pressing: Pressing }) {
  return (
    <div className="flex h-(--dot) shrink-0 items-center gap-[calc(var(--pitch)-var(--dot))]">
      {COLOURS.map((colour) => (
        <button
          key={colour.key}
          type="button"
          aria-label={colour.name}
          onMouseDown={aiming(pressing)}
          onClick={() => pressing.onKey(colour.key)}
          className={cn(
            'relative flex size-(--dot) shrink-0 items-center justify-center select-none after:absolute after:inset-y-0 after:-inset-x-[calc((var(--pitch)-var(--dot))/2)] after:content-[""] focus-visible:outline-none focus-visible:[&_i]:shadow-ring active:[&_i]:translate-x-px active:[&_i]:translate-y-px',
            pressable,
          )}
        >
          <i
            className={cn(
              'block size-(--dot) rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,.35)] transition-[translate] duration-150 ease-toy',
              colour.fill,
            )}
          />
        </button>
      ))}
    </div>
  )
}

/** The digits 1 to 9 and 0 in one row, drawn out to the right of `123`, or on the row above it when the band has no room beside. */
function Digits({ pressing }: { pressing: Pressing }) {
  return (
    <div
      role="group"
      aria-label="数字"
      className="flex shrink-0 gap-[calc(var(--key-pitch)-var(--key))]"
    >
      {DIGITS.map((digit) => (
        <button
          key={digit}
          type="button"
          onMouseDown={aiming(pressing)}
          onClick={() => pressing.onKey(digit)}
          className={cn(
            KEY_LOOK,
            'size-(--key) font-code text-[length:var(--key-font)] leading-none after:absolute after:-inset-[2px] after:content-[""]',
          )}
        >
          {digit}
        </button>
      ))}
    </div>
  )
}

/** The remote control's keys drawn out of the control bar as a band, right over the bar's right-hand controls: `戻る`, the disc, the four colours and `123`, which draws the digits out beside it and puts them away again. Over the picture the band stands on the bar with the scrim under both; a finger in the window gets it under the player's box on the box's own black. Everything is measured against the player's width. */
export function DataBroadcastBand({
  fit,
  numbers,
  onNumbers,
  onKey,
  onAim,
}: {
  fit: BandFit
  numbers: boolean
  onNumbers: (shown: boolean) => void
  onKey: (key: BmlKey) => void
  onAim: () => void
}) {
  const pressing: Pressing = { onKey, onAim }
  const underTheBox = fit === 'coarse'

  return (
    <div className="[container-type:inline-size]">
      <div
        role="group"
        aria-label={KEYPAD_NAME}
        data-slot="data-broadcast-band"
        data-fit={fit}
        data-face={numbers ? 'numbers' : 'keys'}
        style={MEASURES}
        className={cn(
          'flex flex-wrap-reverse items-center justify-end gap-x-(--gap) gap-y-(--row-gap) px-4 text-(--pl-ink) max-[700px]:px-3',
          underTheBox
            ? 'min-h-[calc(var(--band)+var(--row-gap)*2)] bg-(--pl-bg) py-(--row-gap)'
            : 'min-h-(--band)',
        )}
      >
        {!underTheBox && (
          <div
            aria-hidden
            data-slot="data-broadcast-scrim"
            style={{ backgroundImage: SCRIM }}
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-[1] h-(--scrim)"
          />
        )}
        <button
          type="button"
          aria-label="戻る"
          onMouseDown={aiming(pressing)}
          onClick={() => onKey('back')}
          className={PILL}
        >
          戻る
        </button>
        <Disc pressing={pressing} />
        <Colours pressing={pressing} />
        <button
          type="button"
          aria-label="123 数字"
          aria-expanded={numbers}
          onMouseDown={aiming(pressing)}
          onClick={() => {
            onAim()
            onNumbers(!numbers)
          }}
          className={cn(PILL, 'font-code', numbers && PILL_ON)}
        >
          123
        </button>
        {numbers && <Digits pressing={pressing} />}
      </div>
    </div>
  )
}
