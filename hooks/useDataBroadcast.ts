'use client'

import { useCallback, useRef, useState, useSyncExternalStore } from 'react'

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
import type { SendToRuntime } from '@/components/data-broadcast/bml-frame'

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

/** The data broadcast of one player: whether it can be opened, what is shown of it, and the way keys reach its runtime. What is shown belongs to one session, so a new channel starts closed. With the setting on, it opens by itself when the catalog asks and the start document is in, once per programme. A Hybridcast application the documents ask for is started through `startApplication`; where there is none, it does not open. */
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
  const count = useRef(0)

  const sameSession = kept.of === session
  const standing = sameSession ? kept.view : DATA_BROADCAST_CLOSED
  const before = sameSession ? kept.openedIn : null
  const settled = dataBroadcastAfter(standing, {
    on: 'availability',
    availability,
  })
  const view = opensByItself(settled, {
    autoOpens,
    autoStart: catalog?.autoStart ?? false,
    availability,
    openedThisProgramme: before === programme,
  })
    ? dataBroadcastAfter(settled, { on: 'autoStart', availability })
    : settled
  const opened = openedIn(view, programme, before)

  if (!sameSession || view !== kept.view || opened !== kept.openedIn) {
    setKept({ of: session, view, openedIn: opened })
  }

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

  const start = async (app: AppStart, nth: number) => {
    const started = startApplication
      ? await startApplication(app)
      : ({ said: 'unreached' } as const)

    if (started.said === 'answered') {
      step({ on: 'appStarted', nth, address: started.answer.address })

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

  return {
    availability,
    view,
    offered: offersDataBroadcast(availability, view),
    connect: (send) => {
      runtime.current = send
    },
    toggle: () => step({ on: 'toggle', availability }),
    press: (key) => runtime.current?.({ kind: 'key', key }),
    hear,
    showNumbers: (shown) => step({ on: 'numbers', shown }),
    quiet: () => step({ on: 'quiet' }),
    closeApplication: () => step({ on: 'appClosed' }),
  }
}
