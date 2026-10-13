'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'

import type { Rect } from '@/lib/caption-placement'
import type { ReceiverId } from '@/lib/bml/line'
import {
  fitsTheBroadcaster,
  keepMemory,
  memoryEntriesOf,
  type MemoryEntries,
  type MemoryStorage,
} from '@/lib/bml/memory'
import { SHARED_REGISTERS } from '@/lib/bml/messages'
import type { DataBroadcastHeld } from '@/lib/data-broadcast-feed'
import type { HybridcastApp } from '@/lib/data-broadcast-view'
import { receiverIdHandedOver } from '@/lib/hybridcast/boundary'
import type { EventInformation } from '@/lib/hybridcast/event-information'
import {
  APP_SIZE,
  appHelloFrom,
  appMessageOf,
  frameNameOf,
  type AppMessage,
  type OwnedApplication,
  type ReceiverMessage,
} from '@/lib/hybridcast/messages'
import { RelayGuard } from '@/lib/hybridcast/relay-guard'
import { useWidth } from '@/hooks/useWidth'
import { cn } from '@/lib/utils'

/** How the player talks to the application's document that opened last. */
export type SendToApp = (message: ReceiverMessage) => void

/** What the player hears of the application: what its documents say, and the frame lost, before its first document opened on the relay or after a later one went elsewhere. */
export type AppHeard =
  Exclude<AppMessage, { kind: 'memory' }> | { kind: 'lost'; unopened: boolean }

/** The sandbox of the application's frame: scripts and forms run, in an opaque origin of their own, and nothing reaches the page around it. */
export const HYBRIDCAST_SANDBOX = 'allow-scripts allow-forms'

/** How long a document has from the frame's load to answer, over the port of its own hello, that it loaded on the relay before the frame is taken to have left it. */
export const OPENED_WITHIN_MS = 2000

export const HYBRIDCAST_FRAME_TITLE = 'Hybridcast'

function storageOf(): MemoryStorage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function memoryOf(service: number | null): MemoryEntries {
  const storage = storageOf()

  return storage && service !== null ? memoryEntriesOf(storage, service) : []
}

function relayOf(address: string): string {
  return address.split(/[?#]/)[0]
}

/** The mask that keeps the application's drawing off the picture, where its bitmap does not let it draw there (IPTVFJ STD-0013 5.1.1): the whole frame with the picture's rectangle taken out, so the picture under it shows whole. */
export function pictureHole(rect: Rect | null): CSSProperties {
  if (!rect) {
    return {}
  }

  return {
    maskImage: 'linear-gradient(#000 0 0), linear-gradient(#000 0 0)',
    maskSize: `100% 100%, ${rect.width}px ${rect.height}px`,
    maskPosition: `0 0, ${rect.left}px ${rect.top}px`,
    maskRepeat: 'no-repeat',
    maskComposite: 'exclude',
  }
}

interface FrameProps {
  address: string
  application: OwnedApplication
  feed: DataBroadcastHeld
  service: number | null
  programme: EventInformation | null
  receiverId: ReceiverId | null
  greg: readonly string[] | null
  keysTo: HTMLElement | null
  onHeard: (message: AppHeard) => void
  onSender: (send: SendToApp | null) => void
}

/** The application's frame, at 1920x1080 scaled to the box. It is handed the state its documents read at once in its name, and talks to each document that opens on the relay over the port that document hands over: the receiver's identifier, where the whole boundary permits it, the event messages and NPT of the broadcast, the programme and the keys go to it; what it says comes back. Each load of the frame is paired with one hello, and the port of that hello is asked once the load is over whether its document loaded; a load that does not answer within a moment is not on the relay, and the frame is given up. The frame never keeps the focus: the keys are the player's, which hands them over as the remote's. */
function HybridcastFrame({
  address,
  application,
  feed,
  service,
  programme,
  receiverId,
  greg,
  keysTo,
  onHeard,
  onSender,
}: FrameProps) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [box, setBox] = useState<HTMLDivElement | null>(null)
  const width = useWidth(box)
  const relay = relayOf(address)
  const [name] = useState(() =>
    frameNameOf({
      application,
      greg: greg
        ? [...greg]
        : Array.from({ length: SHARED_REGISTERS }, () => ''),
      memory: memoryOf(service),
      programme,
      name: '',
    }),
  )
  const [hole, setHole] = useState<Rect | null>(null)
  const port = useRef<MessagePort | null>(null)
  const [guard] = useState(() => new RelayGuard<MessagePort>())
  const waits = useRef<ReturnType<typeof setTimeout>[]>([])
  const latest = useRef({
    boundary: application.boundary,
    programme,
    receiverId,
    service,
    keysTo,
    onHeard,
    onSender,
  })
  const handsTheId =
    receiverIdHandedOver(application.boundary, receiverId) !== null
  const programmeTold = JSON.stringify(programme)

  useEffect(() => {
    latest.current = {
      boundary: application.boundary,
      programme,
      receiverId,
      service,
      keysTo,
      onHeard,
      onSender,
    }
  })

  useEffect(() => {
    const takeTheKeysBack = () => {
      const timer = setTimeout(() => {
        if (document.activeElement === frame.current) {
          latest.current.keysTo?.focus({ preventScroll: true })
        }
      }, 0)

      waits.current.push(timer)
    }

    window.addEventListener('blur', takeTheKeysBack)

    return () => window.removeEventListener('blur', takeTheKeysBack)
  }, [])

  useEffect(() => {
    const send: SendToApp = (message) => port.current?.postMessage(message)

    const take = (from: MessagePort, message: AppMessage) => {
      const { service: held, onHeard: heard } = latest.current

      if (message.kind === 'loaded') {
        guard.loaded(from)

        return
      }

      if (message.kind === 'leave') {
        heard({ kind: 'lost', unopened: false })

        return
      }

      if (message.kind === 'memory') {
        const storage = storageOf()

        if (
          storage &&
          held !== null &&
          fitsTheBroadcaster(storage, held, message.name, message.value)
        ) {
          keepMemory(storage, held, message.name, message.value)
        }

        return
      }

      if (message.kind === 'videoRect') {
        setHole(message.over ? null : message.rect)
      }

      heard(message)
    }

    const listen = (event: MessageEvent) => {
      const hello = appHelloFrom(
        {
          origin: event.origin,
          source: event.source,
          data: event.data,
          ports: event.ports,
        },
        frame.current?.contentWindow,
        relay,
      )

      if (!hello) {
        return
      }

      const paired = guard.hello(hello.port)

      if (!paired.accepted) {
        hello.port.close()

        return
      }

      port.current?.close()
      port.current = hello.port
      hello.port.onmessage = (said) => {
        const message = appMessageOf(said.data)

        if (message) {
          take(hello.port, message)
        }
      }
      send({
        kind: 'welcome',
        receiverId: receiverIdHandedOver(
          latest.current.boundary,
          latest.current.receiverId,
        ),
        npt: [...feed.nptReadings],
      })
      send({ kind: 'programme', programme: latest.current.programme })

      if (paired.ask) {
        send({ kind: 'checkLoaded' })
      }
    }

    window.addEventListener('message', listen)

    const letGo = feed.subscribe((change) => {
      if (change.kind === 'event') {
        send({ kind: 'event', event: change.event })
      } else if (change.kind === 'npt') {
        send({ kind: 'npt', reading: change.reading })
      }
    })
    const waiting = waits.current

    latest.current.onSender(send)

    return () => {
      window.removeEventListener('message', listen)
      letGo()
      waiting.forEach(clearTimeout)
      port.current?.close()
      port.current = null
      latest.current.onSender(null)
    }
  }, [feed, relay, guard])

  useEffect(() => {
    port.current?.postMessage({
      kind: 'programme',
      programme: latest.current.programme,
    } satisfies ReceiverMessage)
  }, [programmeTold])

  useEffect(() => {
    port.current?.postMessage({
      kind: 'welcome',
      receiverId: receiverIdHandedOver(
        latest.current.boundary,
        latest.current.receiverId,
      ),
      npt: [],
    } satisfies ReceiverMessage)
  }, [handsTheId, receiverId?.caSystemId, receiverId?.cardId])

  const loaded = () => {
    const { nth, ask } = guard.load()

    ask?.postMessage({ kind: 'checkLoaded' } satisfies ReceiverMessage)
    waits.current.push(
      setTimeout(() => {
        const verdict = guard.verdict(nth)

        if (verdict !== 'kept') {
          latest.current.onHeard({
            kind: 'lost',
            unopened: verdict === 'unopened',
          })
        }
      }, OPENED_WITHIN_MS),
    )
  }

  return (
    <div ref={setBox} className="absolute inset-0">
      <iframe
        ref={frame}
        title={HYBRIDCAST_FRAME_TITLE}
        name={name}
        src={address}
        sandbox={HYBRIDCAST_SANDBOX}
        referrerPolicy="no-referrer"
        tabIndex={-1}
        onLoad={loaded}
        style={{
          width: APP_SIZE.width,
          height: APP_SIZE.height,
          transform: `scale(${width / APP_SIZE.width})`,
          ...pictureHole(hole),
        }}
        className={cn(
          'absolute top-0 left-0 origin-top-left border-0 [color-scheme:normal]',
          width === 0 && 'invisible',
        )}
      />
    </div>
  )
}

/** Where the Hybridcast application the documents started runs, over the player's box in their place. Its frame opens once Carina started the application, and opens afresh for another application put in its place; until then the place stays empty over the picture, and the band says what runs and closes it back to the documents. */
export function HybridcastFace({
  app,
  ...frame
}: Omit<FrameProps, 'address' | 'application'> & { app: HybridcastApp }) {
  const { address, application } = app

  return (
    <div
      data-slot="hybridcast-face"
      data-started={address === null ? 'no' : 'yes'}
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
    >
      {address && application && (
        <HybridcastFrame
          key={app.nth}
          address={address}
          application={application}
          {...frame}
        />
      )}
    </div>
  )
}
