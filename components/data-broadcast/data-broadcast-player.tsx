'use client'

import {
  useEffect,
  useEffectEvent,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react'

import type { AitApplication, AppStart } from '@/lib/bml/ait'
import type { BmlCatalog } from '@/lib/bml/catalog'
import type { BmlKey } from '@/lib/bml/keys'
import { unreached, type TransmitAnswer } from '@/lib/bml/line'
import {
  NO_LINE,
  takenFromTheDocuments,
  type DataBroadcastLine,
} from '@/lib/data-broadcast-line'
import {
  keepMemory,
  memoryEntriesOf,
  type MemoryStorage,
} from '@/lib/bml/memory'
import type { RuntimeMessage } from '@/lib/bml/messages'
import { moduleToHand, type BmlModule } from '@/lib/bml/resources'
import type { DataBroadcastHeld } from '@/lib/data-broadcast-feed'
import type { BandPlace } from '@/lib/data-broadcast-view'
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
import {
  transmitAnswerOf,
  type Relayed,
} from '@/repository/live-data-broadcast'

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

/** What the viewer is told of a transmission through the relay: the setting refusing the line, the broadcaster's server not reached, or nothing. */
function saidOf(relayed: Relayed<TransmitAnswer>): RuntimeMessage | null {
  if (relayed.said === 'off') {
    return { kind: 'line', said: 'off' }
  }

  return relayed.said === 'unreached' || unreached(relayed.answer)
    ? { kind: 'line', said: 'unreached' }
    : null
}

const NO_STARTS: readonly AppStart[] = []

/** The broadcast's face over the player's 16:9 box: the runtime's frame, handed the fonts, the catalog and the modules when it loads and every change after, and the one line said at its bottom. What the runtime asks to keep is written to the browser's storage under the broadcaster. Coming back from a Hybridcast application, the runtime is handed the shared registers it left with, and the starts that failed so that it does not ask for them again. */
export function DataBroadcastFace({
  feed,
  onAir = NOTHING_ON_AIR,
  line = NO_LINE,
  greg = null,
  failedStarts = NO_STARTS,
  onRuntime,
  onMessage,
  says,
}: {
  feed: DataBroadcastHeld
  onAir?: OnAir
  line?: DataBroadcastLine
  greg?: readonly string[] | null
  failedStarts?: readonly AppStart[]
  onRuntime: (send: SendToRuntime | null) => void
  onMessage: (message: RuntimeMessage) => void
  says: string | null
}) {
  const alive = useRef(false)
  const letGo = useRef<(() => void) | null>(null)
  const runtime = useRef<SendToRuntime | null>(null)
  const gone = useEffectEvent(() => onRuntime(null))
  const lineNow = useRef(line)
  const tell = useRef(onMessage)
  const lineState = line.state
  const receiverId = line.receiverId
  const hybridcast = line.hybridcast
  const failedNow = useRef(failedStarts)
  const handedGreg = useRef(greg)

  const transmit = async (
    send: SendToRuntime,
    message: Extract<RuntimeMessage, { kind: 'transmit' }>,
  ) => {
    const { state, relay } = lineNow.current
    const answered: Relayed<TransmitAnswer> =
      relay && state === 'on'
        ? await relay.transmit(message.uri, message.text, message.charset)
        : { said: state === 'off' ? 'off' : 'unreached' }
    const said = saidOf(answered)

    if (!alive.current) {
      return
    }

    send({
      kind: 'transmitted',
      id: message.id,
      answer: transmitAnswerOf(answered),
    })

    if (said) {
      tell.current(said)
    }
  }

  const fetchOverTheLine = async (
    send: SendToRuntime,
    message: Extract<RuntimeMessage, { kind: 'fetch' }>,
  ) => {
    const { state, relay } = lineNow.current
    const fetched: Relayed<BmlModule> =
      relay && state === 'on'
        ? await relay.fetch(message.uri)
        : { said: state === 'off' ? 'off' : 'unreached' }

    if (!alive.current) {
      return
    }

    if (fetched.said === 'answered') {
      const handed = moduleToHand(fetched.answer)

      send(
        { kind: 'fetched', id: message.id, module: handed.module },
        handed.transfer,
      )

      return
    }

    send({ kind: 'fetched', id: message.id, module: null })
    tell.current({ kind: 'line', said: fetched.said })
  }

  const readAit = async (
    send: SendToRuntime,
    message: Extract<RuntimeMessage, { kind: 'ait' }>,
  ) => {
    const { hybridcast: allowed, relay } = lineNow.current
    const read =
      relay && allowed ? await relay.ait(message.uri) : { said: 'off' as const }
    const applications: AitApplication[] | null =
      read.said === 'answered' ? read.answer : null

    if (alive.current) {
      send({ kind: 'aitRead', id: message.id, applications })
    }
  }

  const heard = (message: RuntimeMessage) => {
    const storage = storageOf()
    const service = feed.catalog?.service
    const send = runtime.current

    if (message.kind === 'memory' && storage && service !== undefined) {
      keepMemory(storage, service, message.name, message.value)
    }

    if (message.kind === 'transmit') {
      if (send) {
        void transmit(send, message)
      }

      return
    }

    if (message.kind === 'fetch') {
      if (send) {
        void fetchOverTheLine(send, message)
      }

      return
    }

    if (message.kind === 'ait') {
      if (send) {
        void readAit(send, message)
      }

      return
    }

    if (!takenFromTheDocuments(message, lineNow.current)) {
      return
    }

    onMessage(message)
  }

  useEffect(() => {
    lineNow.current = line
    tell.current = onMessage
    failedNow.current = failedStarts
  })

  useEffect(() => {
    runtime.current?.({ kind: 'line', line: lineState, receiverId })
  }, [lineState, receiverId])

  useEffect(() => {
    runtime.current?.({
      kind: 'hybridcast',
      allowed: hybridcast,
      failed: [...failedNow.current],
    })
  }, [hybridcast])

  useEffect(() => {
    alive.current = true

    return () => {
      alive.current = false
      runtime.current = null
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

    const { state, receiverId: given } = lineNow.current

    send({ kind: 'line', line: state, receiverId: given })
    send({
      kind: 'hybridcast',
      allowed: lineNow.current.hybridcast,
      failed: [...failedNow.current],
    })

    if (handedGreg.current) {
      send({ kind: 'greg', greg: [...handedGreg.current] })
    }

    send({ kind: 'open' })
    runtime.current = send
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

/** Where the Hybridcast application the documents started runs. Its frame comes here; until it does, the place stays empty over the picture, and the band says what runs and closes it back to the documents. */
export function HybridcastFace({ address }: { address: string | null }) {
  return (
    <div
      data-slot="hybridcast-face"
      data-started={address === null ? 'no' : 'yes'}
      className="pointer-events-none absolute inset-0 z-[1]"
    />
  )
}

/** The width of the mock's player. The band is drawn at the mock's measures there and grows with the player, up to one and a half times the mock. */
export const BAND_MOCK_WIDTH = 1174

export const BAND_MAX_SCALE = 1.5

/** The band under the box, in a window: the keys' row with 12px above and below, at the mock's measures. */
export const BAND_UNDER_THE_BOX = 160

/** The widest the player's column may be while its control row, `row` pixels high as laid out, is under its box and the remote is in the page's column: the window holds the picture, the 210px around it and the row. */
export function columnOverTheRow(row: number): string {
  return `calc((100dvh - ${210 + row}px) * 16 / 9)`
}

/** The widest the player's column may be while its control row, `row` pixels high as laid out, and the band are under its box: the window holds the picture, the 210px around it, the row and the band. The band is 160px up to the mock's width, grows with the column up to one and a half times the mock, and stays there; each stretch gives its own bound and the column takes the one its width falls in. */
export function columnOverTheBand(row: number): string {
  const around = 210 + row
  const widest = BAND_MOCK_WIDTH * BAND_MAX_SCALE
  const narrow = `calc((100dvh - ${around + BAND_UNDER_THE_BOX}px) * 16 / 9)`
  const wide = `calc((100dvh - ${around + BAND_UNDER_THE_BOX * BAND_MAX_SCALE}px) * 16 / 9)`
  const growing = `calc((100dvh - ${around}px) / (9 / 16 + ${BAND_UNDER_THE_BOX} / ${BAND_MOCK_WIDTH}))`

  return `min(${narrow}, max(${wide}, clamp(${BAND_MOCK_WIDTH}px, ${growing}, ${widest}px)))`
}

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

export const HYBRIDCAST_NAME = 'Hybridcast'

export const CLOSE_HYBRIDCAST_NAME = 'Hybridcast を閉じる'

/** The station and what is open on it, `データ放送` or `Hybridcast`: the station bold, what is open in the quieter ink. Where both do not fit on one line, what is open goes under the station, and only a station that does not fit on its own line is cut short. */
function StationLine({
  station,
  what,
  className,
}: {
  station: string
  what: string
  className?: string
}) {
  return (
    <p
      data-slot="station-line"
      className={cn(
        'flex min-w-0 flex-wrap items-baseline gap-x-[0.4em] leading-tight whitespace-nowrap text-(--pl-ink)',
        className,
      )}
    >
      {station && <b className="min-w-0 truncate font-bold">{station}</b>}
      <span className="shrink-0 font-medium text-(--pl-ink-2)">{what}</span>
    </p>
  )
}

/** The Hybridcast application running, at the band's left: the station and `Hybridcast`, and `閉じる`, which goes back to the documents. It takes what room the keys leave. Where the station and `Hybridcast` do not fit on one line, `Hybridcast` goes under the station, and only a station that does not fit on its own line is cut short, before the keys move. */
function OnTheBand({
  station,
  onClose,
  onAim,
}: {
  station: string
  onClose: () => void
  onAim: () => void
}) {
  return (
    <div
      role="group"
      aria-label={HYBRIDCAST_NAME}
      data-slot="hybridcast-on-the-band"
      className="flex min-w-0 grow basis-0 items-center gap-(--row-gap)"
    >
      <StationLine
        station={station}
        what={HYBRIDCAST_NAME}
        className="text-[length:var(--key-font)]"
      />
      <button
        type="button"
        aria-label={CLOSE_HYBRIDCAST_NAME}
        onMouseDown={(event) => {
          event.preventDefault()
          onAim()
        }}
        onClick={onClose}
        className={PILL}
      >
        閉じる
      </button>
    </div>
  )
}

/** The remote control's keys as a band, right-aligned with the bar's right-hand controls: `戻る`, the disc, the four colours and `123`, which draws the digits out beside it and puts them away again. While a Hybridcast application runs, its station and `閉じる` stand at the band's left. In a window the band is under the player's box on the box's own black, so nothing covers the documents' face; in fullscreen it stands on the bar with the scrim under both. Everything is measured against the player's width. */
export function DataBroadcastBand({
  place,
  numbers,
  onNumbers,
  onKey,
  onAim,
  station,
  application = null,
}: {
  place: Exclude<BandPlace, 'column'>
  numbers: boolean
  onNumbers: (shown: boolean) => void
  onKey: (key: BmlKey) => void
  onAim: () => void
  station?: string
  application?: { station: string; onClose: () => void } | null
}) {
  const pressing: Pressing = { onKey, onAim }
  const underTheBox = place === 'under'

  return (
    <div className="[container-type:inline-size]">
      <div
        role="group"
        aria-label={KEYPAD_NAME}
        data-slot="data-broadcast-band"
        data-place={place}
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
        {application && (
          <OnTheBand
            station={application.station}
            onClose={application.onClose}
            onAim={onAim}
          />
        )}
        {!application && station !== undefined && (
          <div className="flex min-w-0 grow basis-0 items-center">
            <StationLine
              station={station}
              what={DATA_BROADCAST_NAME}
              className="text-[length:var(--key-font)]"
            />
          </div>
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

/** The remote's measures in the column, at the mock's column of 370px: the disc and its wedges, the arrows and Enter at 1.35 times the band's, `戻る` and `閉じる` at 64x44, the colour dots at 52 with 18 between, and the digits' pills 48 high. */
const IN_THE_COLUMN = {
  '--disc': '184px',
  '--wedge': '101.5px',
  '--reach': '61px',
  '--arrow': '30px',
  '--ok': '65px',
  '--ok-font': '15px',
  '--pill-h': '44px',
  '--pill-w': '64px',
  '--pill-font': '13px',
  '--dot': '52px',
  '--pitch': '70px',
  '--line-font': '13px',
  '--digit-font': '17px',
} as CSSProperties

/** The remote at its least height in the column: its padding, the station's line, the disc, the dots and the digits' four rows, with the least gap between each. */
export const REMOTE_LEAST_HEIGHT =
  2 * 20 + 44 + 184 + 52 + (4 * 48 + 3 * 14) + 3 * 24 + 2

const DIGIT_GRID: (BmlKey | null)[] = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  null,
  '0',
  null,
]

/** The remote control as a tall card in the page's column, as the real one is laid out: the station and what is open on it, the disc with `戻る` at its lower left, the four colours in a row, and the digits 1 to 9 and 0 three to a row, always there. While a Hybridcast application runs, `閉じる` stands at the end of the station's line and no other key moves. The groups share out the card's height, at least 24px apart. */
export function DataBroadcastRemote({
  station,
  onKey,
  onAim,
  application = null,
}: {
  station: string
  onKey: (key: BmlKey) => void
  onAim: () => void
  application?: { onClose: () => void } | null
}) {
  const pressing: Pressing = { onKey, onAim }

  return (
    <div
      role="group"
      aria-label={KEYPAD_NAME}
      data-slot="data-broadcast-remote"
      style={{ ...IN_THE_COLUMN, minHeight: REMOTE_LEAST_HEIGHT }}
      className="flex h-full flex-col justify-between gap-[24px] rounded-xl border border-line-strong bg-(--pl-bg) p-[20px] text-(--pl-ink) shadow-pop-xl"
    >
      <div className="flex h-[44px] shrink-0 items-center gap-[12px]">
        {application ? (
          <div
            role="group"
            aria-label={HYBRIDCAST_NAME}
            data-slot="hybridcast-on-the-band"
            className="flex min-w-0 flex-1 items-center gap-[12px]"
          >
            <StationLine
              station={station}
              what={HYBRIDCAST_NAME}
              className="min-w-0 flex-1 text-[length:var(--line-font)]"
            />
            <button
              type="button"
              aria-label={CLOSE_HYBRIDCAST_NAME}
              onMouseDown={(event) => {
                event.preventDefault()
                onAim()
              }}
              onClick={application.onClose}
              className={PILL}
            >
              閉じる
            </button>
          </div>
        ) : (
          <StationLine
            station={station}
            what={DATA_BROADCAST_NAME}
            className="text-[length:var(--line-font)]"
          />
        )}
      </div>
      <div className="relative flex shrink-0 justify-center">
        <Disc pressing={pressing} />
        <button
          type="button"
          aria-label="戻る"
          onMouseDown={aiming(pressing)}
          onClick={() => onKey('back')}
          className={cn(PILL, 'absolute bottom-0 left-0')}
        >
          戻る
        </button>
      </div>
      <div className="flex shrink-0 justify-center">
        <Colours pressing={pressing} />
      </div>
      <div
        role="group"
        aria-label="数字"
        className="mx-auto grid w-full max-w-[330px] shrink-0 grid-cols-3 gap-x-[18px] gap-y-[14px]"
      >
        {DIGIT_GRID.map((digit, nth) =>
          digit === null ? (
            <i key={`gap-${nth}`} aria-hidden />
          ) : (
            <button
              key={digit}
              type="button"
              onMouseDown={aiming(pressing)}
              onClick={() => onKey(digit)}
              className={cn(
                KEY_LOOK,
                'h-[48px] w-full font-code text-[length:var(--digit-font)] leading-none after:absolute after:-inset-[2px] after:content-[""]',
              )}
            >
              {digit}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
