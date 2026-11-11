'use client'

import { useEffect, useEffectEvent, useRef } from 'react'

import type { AitApplication, AppStart } from '@/lib/bml/ait'
import type { BmlCatalog } from '@/lib/bml/catalog'
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
import {
  programmeOnAir,
  type OnAir,
  type RuntimeMessage,
} from '@/lib/bml/messages'
import type { Residence } from '@/lib/bml/receiver-info'
import { moduleToHand, type BmlModule } from '@/lib/bml/resources'
import type { DataBroadcastHeld } from '@/lib/data-broadcast-feed'
import type { SendToRuntime } from '@/components/data-broadcast/bml-frame'
import { FrameOnDemand } from '@/components/data-broadcast/frame-on-demand'
import { fontsForTheRuntime } from '@/components/data-broadcast/bml-fonts'
import { residenceFromCarina } from '@/components/data-broadcast/residence'
import {
  transmitAnswerOf,
  type Relayed,
} from '@/repository/live-data-broadcast'

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
  send({ kind: 'programme', programme: programmeOnAir(catalog.service, onAir) })
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

/** The broadcast's face over the player's 16:9 box: the runtime's frame, handed the fonts, the receiver's residence as `readResidence` reads it, the catalog, the modules and the time on air where the feed keeps one when it loads and every change after, and the one line said at its bottom. What the runtime asks to keep is written to the browser's storage under the broadcaster. Coming back from a Hybridcast application, the runtime is handed the shared registers as the application left them, the starts that failed so that it does not ask for them again, and the start document of the component the application named, if it named one. */
export function DataBroadcastFace({
  feed,
  onAir = NOTHING_ON_AIR,
  line = NO_LINE,
  greg = null,
  failedStarts = NO_STARTS,
  startup = null,
  readResidence = residenceFromCarina,
  onRuntime,
  onMessage,
  says,
}: {
  feed: DataBroadcastHeld
  onAir?: OnAir
  line?: DataBroadcastLine
  greg?: readonly string[] | null
  failedStarts?: readonly AppStart[]
  startup?: string | null
  readResidence?: () => Promise<Residence>
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
    const [fonts, residence] = await Promise.all([
      fontsForTheRuntime(),
      readResidence(),
    ])

    if (!alive.current) {
      return
    }

    send(
      { kind: 'font', fonts },
      fonts.map((font) => font.bytes),
    )
    send({ kind: 'residence', residence })

    const catalog = feed.catalog

    if (catalog) {
      catalogued(send, catalog, onAir)
    }

    feed.forTheCatalog.forEach((module) => hand(send, module))
    feed.nptReadings.forEach((reading) => send({ kind: 'npt', reading }))

    if (feed.clock !== null) {
      send({ kind: 'clock', seconds: feed.clock })
    }

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

    send(startup ? { kind: 'open', startup } : { kind: 'open' })
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
      } else if (change.kind === 'clock') {
        send({ kind: 'clock', seconds: change.seconds })
      }
    })
  }

  return (
    <>
      <FrameOnDemand onReady={ready} onMessage={heard} className="z-[1]" />
      <p
        role="status"
        data-slot="data-broadcast-says"
        className="pointer-events-none absolute inset-x-0 bottom-[30%] z-[2] flex justify-center"
      >
        {says && (
          <span className="max-w-[88%] rounded-full bg-black/80 px-4 py-2 text-center text-ui font-medium text-(--pl-ink)">
            {says}
          </span>
        )}
      </p>
    </>
  )
}
