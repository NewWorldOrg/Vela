'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

import type { AppStart } from '@/lib/bml/ait'
import type { BmlKey } from '@/lib/bml/keys'
import type { RuntimeMessage } from '@/lib/bml/messages'
import type {
  DataBroadcastAvailability,
  DataBroadcastHeld,
} from '@/lib/data-broadcast-feed'
import {
  DATA_BROADCAST_CLOSED,
  LINE_SAID_LASTS_MS,
  RECEIVING_SAID_AFTER_MS,
  SCRIPT_GIVEN_UP_AFTER_MS,
  UNOPENED_LASTS_MS,
  UNSUPPORTED_LASTS_MS,
  dataBroadcastAfter,
  offersDataBroadcast,
  opensByItself,
  type DataBroadcastStep,
  type DataBroadcastView,
} from '@/lib/data-broadcast-view'
import type { StartApplication } from '@/lib/data-broadcast-line'
import {
  appEndSaid,
  startupOf,
  type HybridcastApp,
} from '@/lib/data-broadcast-view'
import type { SendToRuntime } from '@/components/data-broadcast/bml-frame'
import type {
  AppHeard,
  SendToApp,
} from '@/components/data-broadcast/hybridcast-frame'

interface Kept {
  of: string | null
  view: DataBroadcastView
  openedIn: string | null
}

/** Whether the broadcast opens by itself, and the programme being watched, so that one closed by hand stays closed until the programme changes. */
export interface AutoOpens {
  autoOpens: boolean
  programme: string
}

const BY_HAND_ONLY: AutoOpens = { autoOpens: false, programme: '' }

export interface DataBroadcast {
  availability: DataBroadcastAvailability
  view: DataBroadcastView
  offered: boolean
  connect: (send: SendToRuntime | null) => void
  toggle: () => void
  press: (key: BmlKey) => void
  hear: (message: RuntimeMessage) => void
  showNumbers: (shown: boolean) => void
  quiet: () => void
  closeApplication: () => void
  connectApp: (send: SendToApp | null) => void
  hearApp: (message: AppHeard) => void
}

const unreachable = () => 'absent' as const

const noCatalog = () => null

function openedIn(
  view: DataBroadcastView,
  programme: string,
  before: string | null,
): string | null {
  return view.open ? programme : before
}

/** The data broadcast of one player: whether it can be opened, what is shown of it, and the way keys reach its runtime, or the Hybridcast application running in its place. What is shown belongs to one session, so a new channel starts closed, and an application with it. With the setting on, it opens by itself when the catalog asks and the start document is in, once per programme. A Hybridcast application the documents ask for, or one an application asks for in its own place, is started through `startApplication`; where there is none, it does not open, and one running gives way to the documents. Keys go to the application only from the groups its key set takes. */
export function useDataBroadcast(
  feed: DataBroadcastHeld,
  session: string | null,
  { autoOpens, programme }: AutoOpens = BY_HAND_ONLY,
  startApplication: StartApplication | null = null,
): DataBroadcast {
  const subscribe = useCallback(
    (onChange: () => void) => feed.subscribe(onChange),
    [feed],
  )
  const availability = useSyncExternalStore(
    subscribe,
    () => feed.availability,
    unreachable,
  )
  const catalog = useSyncExternalStore(subscribe, () => feed.catalog, noCatalog)
  const [kept, setKept] = useState<Kept>({
    of: session,
    view: DATA_BROADCAST_CLOSED,
    openedIn: null,
  })
  const runtime = useRef<SendToRuntime | null>(null)
  const app = useRef<SendToApp | null>(null)
  const count = useRef(0)

  const sameSession = kept.of === session
  const standing = sameSession ? kept.view : DATA_BROADCAST_CLOSED
  const before = sameSession ? kept.openedIn : null
  const settled = dataBroadcastAfter(standing, {
    on: 'availability',
    availability,
  })
  const allowed =
    settled.hybridcast && !startApplication
      ? dataBroadcastAfter(settled, {
          on: 'appClosed',
          why: { why: 'notAllowed' },
        })
      : settled
  const view = opensByItself(allowed, {
    autoOpens,
    autoStart: catalog?.autoStart ?? false,
    availability,
    openedThisProgramme: before === programme,
  })
    ? dataBroadcastAfter(allowed, { on: 'autoStart', availability })
    : allowed
  const opened = openedIn(view, programme, before)

  if (!sameSession || view !== kept.view || opened !== kept.openedIn) {
    setKept({ of: session, view, openedIn: opened })
  }

  const ran = useRef<{ app: HybridcastApp | null; session: string | null }>({
    app: null,
    session,
  })

  useEffect(() => {
    const before = ran.current

    ran.current = { app: view.hybridcast, session }

    if (!before.app || view.hybridcast) {
      return
    }

    console.warn(
      appEndSaid(
        before.session === session
          ? (view.appEnded ?? { why: 'broadcastEnded' })
          : { why: 'channelChanged' },
      ),
    )
  })

  const step = (what: DataBroadcastStep) =>
    setKept((was) => {
      const same = was.of === session
      const next = dataBroadcastAfter(
        same ? was.view : DATA_BROADCAST_CLOSED,
        what,
      )

      return {
        of: session,
        view: next,
        openedIn: openedIn(next, programme, same ? was.openedIn : null),
      }
    })

  const unopened = (nth: number) =>
    setTimeout(
      () => step({ on: 'appFaded', appNotices: nth }),
      UNOPENED_LASTS_MS,
    )

  const start = async (asked: AppStart, nth: number) => {
    const started = startApplication
      ? await startApplication(asked)
      : ({ said: 'unreached' } as const)

    if (started.said === 'answered') {
      step({ on: 'appStarted', nth, ...started.answer })

      return
    }

    step({ on: 'appUnopened', nth })
    unopened(nth)
  }

  const hear = (message: RuntimeMessage) => {
    count.current += 1

    const nth = count.current

    step({ on: 'runtime', message, nth })

    if (message.kind === 'startApp') {
      void start(message.start, nth)
    }

    if (message.kind === 'unopened') {
      unopened(nth)
    }

    if (message.kind === 'waiting' && message.waiting) {
      setTimeout(
        () => step({ on: 'slow', waits: nth }),
        RECEIVING_SAID_AFTER_MS,
      )
    }

    if (message.kind === 'unsupported') {
      setTimeout(
        () => step({ on: 'faded', notices: nth }),
        UNSUPPORTED_LASTS_MS,
      )
    }

    if (message.kind === 'line') {
      setTimeout(
        () => step({ on: 'lineFaded', lineNotices: nth }),
        LINE_SAID_LASTS_MS,
      )
    }

    if (message.kind === 'script' && message.state === 'running') {
      setTimeout(
        () => step({ on: 'overran', scripting: nth }),
        SCRIPT_GIVEN_UP_AFTER_MS,
      )
    }
  }

  const hearApp = (message: AppHeard) => {
    count.current += 1

    const nth = count.current

    switch (message.kind) {
      case 'videoRect':
        step({ on: 'appRect', rect: message.rect })
        return
      case 'keySet':
        step({ on: 'appKeys', mask: message.mask })
        return
      case 'greg':
        step({ on: 'appGreg', greg: message.greg })
        return
      case 'destroy':
        step({ on: 'appClosed', why: { why: 'destroyed' } })
        return
      case 'launchBml':
        step({
          on: 'appClosed',
          why: { why: 'toTheDocuments', componentTag: message.componentTag },
          startup:
            message.componentTag === null
              ? null
              : startupOf(message.componentTag),
        })
        return
      case 'replace':
        step({ on: 'appReplaced', start: message.start, nth })
        void start(message.start, nth)
        return
      case 'romsound':
        return
      case 'lost':
        step({ on: 'appLost', end: message.end, nth })

        if (message.end.why === 'unopened') {
          unopened(nth)
        }

        return
    }
  }

  return {
    availability,
    view,
    offered: offersDataBroadcast(availability, view),
    connect: (send) => {
      runtime.current = send
    },
    toggle: () => step({ on: 'toggle', availability }),
    press: (key) => {
      if (!view.hybridcast) {
        runtime.current?.({ kind: 'key', key })

        return
      }

      if (view.usedKeys.includes(key)) {
        app.current?.({ kind: 'key', key })
      }
    },
    hear,
    showNumbers: (shown) => step({ on: 'numbers', shown }),
    quiet: () => step({ on: 'quiet' }),
    closeApplication: () => step({ on: 'appClosed' }),
    connectApp: (send) => {
      app.current = send
    },
    hearApp,
  }
}
