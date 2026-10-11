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

/** Hands the runtime the catalog, and with it what the player keeps for that broadcaster and the programme on air. */
function catalogued(
  send: SendToRuntime,
  catalog: BmlCatalog,
  startsAt: number | null,
): void {
  const storage = storageOf()

  send({ kind: 'catalog', catalog })
  send({
    kind: 'memory',
    entries: storage ? memoryEntriesOf(storage, catalog.service) : [],
  })
  send({
    kind: 'programme',
    programme: { service: catalog.service, event: null, startsAt },
  })
}

/** The broadcast's face over the player's 16:9 box: the runtime's frame, handed the fonts, the catalog and the modules when it loads and every change after, and the one line said at its bottom. What the runtime asks to keep is written to the browser's storage under the broadcaster. */
export function DataBroadcastFace({
  feed,
  startsAt = null,
  onRuntime,
  onMessage,
  says,
}: {
  feed: DataBroadcastFeed
  startsAt?: number | null
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
      catalogued(send, catalog, startsAt)
    }

    feed.forTheCatalog.forEach((module) => hand(send, module))
    send({ kind: 'open' })
    onRuntime(send)
    letGo.current = feed.subscribe((change) => {
      if (change.kind === 'catalog') {
        catalogued(send, change.catalog, startsAt)
      } else if (change.kind === 'module') {
        hand(send, change.module)
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

/** How the band is pressed: a mouse (`pointer: fine`), a finger in the window, or a finger in fullscreen. */
export type BandFit = 'fine' | 'coarse' | 'coarse-full'

/** The band's height by its fit. A finger in the window gets two rows under the player's box; the others lie over the picture. */
export const BAND_HEIGHT: Record<BandFit, number> = {
  fine: 84,
  coarse: 120,
  'coarse-full': 104,
}

/** The player's column while the band is under its box: the window holds the picture, the 210px around it and the band's 120px. */
export const PLAYER_COLUMN_OVER_THE_BAND = 'max-w-[calc((100dvh_-_330px)*16/9)]'

/** Each fit's measures, taken from the mock as they are: the pills, the disc and its wedges, the arrows, Enter, the colour dots and the digits. */
const MEASURES: Record<BandFit, CSSProperties> = {
  fine: {
    '--band-h': '84px',
    '--pill-h': '40px',
    '--pill-w': '52px',
    '--disc': '72px',
    '--wedge': '40px',
    '--reach': '23px',
    '--arrow': '14px',
    '--ok': '32px',
    '--ok-font': 'calc(11rem / 16)',
    '--dot': '32px',
    '--pitch': '42px',
    '--key': '40px',
    '--key-pitch': '44px',
  } as CSSProperties,
  coarse: {
    '--band-h': '120px',
    '--pill-h': '44px',
    '--pill-w': '60px',
    '--disc': '104px',
    '--wedge': '56px',
    '--reach': '35px',
    '--arrow': '16px',
    '--ok': '44px',
    '--ok-font': 'calc(13rem / 16)',
    '--dot': '40px',
    '--pitch': '48px',
    '--key': '44px',
    '--key-pitch': '48px',
  } as CSSProperties,
  'coarse-full': {
    '--band-h': '104px',
    '--pill-h': '44px',
    '--pill-w': '60px',
    '--disc': '88px',
    '--wedge': '48px',
    '--reach': '29px',
    '--arrow': '16px',
    '--ok': '40px',
    '--ok-font': 'calc(13rem / 16)',
    '--dot': '40px',
    '--pitch': '48px',
    '--key': '44px',
    '--key-pitch': '48px',
  } as CSSProperties,
}

const SINKS =
  'transition-[translate,background-color,border-color,color] duration-150 ease-toy active:translate-x-px active:translate-y-px'

const KEY_LOOK = cn(
  'relative flex shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 font-bold text-(--pl-ink) select-none hover:bg-white/20 focus-visible:shadow-ring focus-visible:outline-none active:bg-white/25',
  SINKS,
  pressable,
)

const PILL = cn(
  KEY_LOOK,
  'h-(--pill-h) w-(--pill-w) text-[calc(13rem/16)] leading-none after:absolute after:-inset-x-[2px] after:-inset-y-[4px] after:content-[""]',
)

const PILL_ON = 'border-white bg-white/28 text-white hover:bg-white/28'

const ENTER_LOOK = cn(
  'absolute top-1/2 left-1/2 z-[1] flex size-(--ok) -translate-1/2 items-center justify-center rounded-full bg-(--pl-accent) text-[length:var(--ok-font)] leading-none font-bold tracking-[-0.02em] text-(--pl-bg) select-none hover:bg-(--pl-accent-ink) focus-visible:shadow-ring focus-visible:outline-none active:translate-[calc(-50%+1px)] active:bg-(--pl-accent)',
  'transition-[translate,background-color] duration-150 ease-toy',
  pressable,
)

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

/** The cross as a remote control has it: one disc, with the four arrows each a wedge of it and Enter at its heart. The wedges reach past the circle and are clipped by it, so a press anywhere in a quarter is that arrow. */
function Disc({ pressing }: { pressing: Pressing }) {
  return (
    <div
      role="group"
      aria-label="十字"
      data-tap-exempt="a wedge of the disc is the press, as wide as the quarter it fills; the cross through its arrow is narrower than the sector"
      className="relative size-(--disc) shrink-0 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/26 ring-inset"
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
          <span className="block -rotate-45 [&_svg]:stroke-[2.4]">
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
    <div className="flex h-[44px] shrink-0 items-center gap-[calc(var(--pitch)-var(--dot))]">
      {COLOURS.map((colour) => (
        <button
          key={colour.key}
          type="button"
          aria-label={colour.name}
          onMouseDown={aiming(pressing)}
          onClick={() => pressing.onKey(colour.key)}
          className={cn(
            'relative flex h-[44px] w-(--dot) shrink-0 items-center justify-center select-none after:absolute after:inset-y-0 after:-inset-x-[calc((var(--pitch)-var(--dot))/2)] after:content-[""] focus-visible:outline-none focus-visible:[&_i]:shadow-ring active:[&_i]:translate-x-px active:[&_i]:translate-y-px',
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

/** The digits 1 to 9 and 0 in one row, drawn out to the right of `123`. */
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
            'size-(--key) font-code text-[calc(15rem/16)] leading-none after:absolute after:-inset-[2px] after:content-[""]',
          )}
        >
          {digit}
        </button>
      ))}
    </div>
  )
}

/** The remote control's keys drawn out of the control bar as a band: `戻る`, the disc, the four colours and `123`, which draws the digits out beside it and puts them away again. The fit decides the measures and whether the digits take a second row. */
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
  const back = (
    <button
      type="button"
      aria-label="戻る"
      onMouseDown={aiming(pressing)}
      onClick={() => onKey('back')}
      className={PILL}
    >
      戻る
    </button>
  )
  const toNumbers = (
    <button
      type="button"
      aria-label="123 数字"
      aria-expanded={numbers}
      onMouseDown={aiming(pressing)}
      onClick={() => {
        onAim()
        onNumbers(!numbers)
      }}
      className={cn(PILL, 'font-code text-title', numbers && PILL_ON)}
    >
      123
    </button>
  )
  const digits = numbers && <Digits pressing={pressing} />

  return (
    <div
      role="group"
      aria-label={KEYPAD_NAME}
      data-slot="data-broadcast-band"
      data-fit={fit}
      data-face={numbers ? 'numbers' : 'keys'}
      data-tap-exempt={
        fit === 'fine'
          ? 'the band for a mouse has mouse-sized keys; a finger is given the coarse band'
          : undefined
      }
      style={MEASURES[fit]}
      className={cn(
        'flex min-h-(--band-h) items-center justify-center gap-[16px] bg-(--pl-bg) px-[16px] text-(--pl-ink)',
        fit !== 'coarse' && 'flex-wrap',
      )}
    >
      {back}
      <Disc pressing={pressing} />
      {fit === 'coarse' ? (
        <div className="flex flex-col items-start gap-[8px]">
          <div className="flex h-[56px] items-center gap-[16px]">
            <Colours pressing={pressing} />
            {toNumbers}
          </div>
          {digits && <div className="flex h-[56px] items-center">{digits}</div>}
        </div>
      ) : (
        <>
          <Colours pressing={pressing} />
          {toNumbers}
          {digits}
        </>
      )}
    </div>
  )
}
