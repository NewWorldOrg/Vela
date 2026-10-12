'use client'

import { useCallback, useRef, useState, useSyncExternalStore } from 'react'

import type { BmlKey } from '@/lib/bml/keys'
import type { RuntimeMessage } from '@/lib/bml/messages'
import type {
  DataBroadcastAvailability,
  DataBroadcastFeed,
} from '@/lib/data-broadcast-feed'
import {
  DATA_BROADCAST_CLOSED,
  RECEIVING_SAID_AFTER_MS,
  UNSUPPORTED_LASTS_MS,
  dataBroadcastAfter,
  offersDataBroadcast,
  type DataBroadcastStep,
  type DataBroadcastView,
} from '@/lib/data-broadcast-view'
import type { SendToRuntime } from '@/components/data-broadcast/bml-frame'

interface Kept {
  of: string | null
  view: DataBroadcastView
}

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
}

const unreachable = () => 'absent' as const

/** The data broadcast of one player: whether it can be opened, what is shown of it, and the way keys reach its runtime. What is shown belongs to one session, so a new channel starts closed. */
export function useDataBroadcast(
  feed: DataBroadcastFeed,
  session: string | null,
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
  const [kept, setKept] = useState<Kept>({
    of: session,
    view: DATA_BROADCAST_CLOSED,
  })
  const runtime = useRef<SendToRuntime | null>(null)
  const count = useRef(0)

  const standing = kept.of === session ? kept.view : DATA_BROADCAST_CLOSED
  const view = dataBroadcastAfter(standing, {
    on: 'availability',
    availability,
  })

  if (kept.of !== session || view !== kept.view) {
    setKept({ of: session, view })
  }

  const step = (what: DataBroadcastStep) =>
    setKept((was) => ({
      of: session,
      view: dataBroadcastAfter(
        was.of === session ? was.view : DATA_BROADCAST_CLOSED,
        what,
      ),
    }))

  const hear = (message: RuntimeMessage) => {
    count.current += 1

    const nth = count.current

    step({ on: 'runtime', message, nth })

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
  }
}
