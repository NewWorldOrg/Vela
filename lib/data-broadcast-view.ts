import type { Rect } from '@/lib/caption-placement'
import { keysOf, type BmlKey } from '@/lib/bml/keys'
import type { RuntimeMessage } from '@/lib/bml/messages'
import { GRID } from '@/lib/bml/style'
import type { DataBroadcastAvailability } from '@/lib/data-broadcast-feed'

export const SAID_RECEIVING = 'ページを受信しています。'

export const SAID_UNSUPPORTED = 'この操作には対応していません。'

export const SAID_FAILED = 'データ放送を表示できませんでした。'

export const RECEIVING_SAID_AFTER_MS = 3000

export const UNSUPPORTED_LASTS_MS = 3000

/** The keys a document takes until it says otherwise: `basic` and `data-button`. */
export const KEYS_UNTIL_TOLD = keysOf(['basic', 'data-button'])

/** What the player shows of a data broadcast. `waits` and `notices` only count up, so a timer started for one wait or one notice cannot end a later one. */
export interface DataBroadcastView {
  open: boolean
  rect: Rect | null
  usedKeys: readonly BmlKey[]
  waiting: boolean
  slow: boolean
  unsupported: boolean
  failed: boolean
  numbers: boolean
  waits: number
  notices: number
}

export const DATA_BROADCAST_CLOSED: DataBroadcastView = {
  open: false,
  rect: null,
  usedKeys: KEYS_UNTIL_TOLD,
  waiting: false,
  slow: false,
  unsupported: false,
  failed: false,
  numbers: false,
  waits: 0,
  notices: 0,
}

function closed(
  view: DataBroadcastView,
  over: Partial<DataBroadcastView> = {},
): DataBroadcastView {
  return {
    ...DATA_BROADCAST_CLOSED,
    waits: view.waits,
    notices: view.notices,
    ...over,
  }
}

export type DataBroadcastStep =
  | { on: 'toggle'; availability: DataBroadcastAvailability }
  | { on: 'availability'; availability: DataBroadcastAvailability }
  | { on: 'runtime'; message: RuntimeMessage }
  | { on: 'slow'; waits: number }
  | { on: 'faded'; notices: number }
  | { on: 'numbers'; shown: boolean }
  | { on: 'quiet' }

/** Whether the player puts the control on its bar: when the broadcast can be opened, and while it is open so that it can be closed. */
export function offersDataBroadcast(
  availability: DataBroadcastAvailability,
  view: DataBroadcastView,
): boolean {
  return availability === 'ready' || view.open
}

function heard(
  view: DataBroadcastView,
  message: RuntimeMessage,
): DataBroadcastView {
  switch (message.kind) {
    case 'videoRect':
      return { ...view, rect: message.rect }
    case 'usedKeys':
      return { ...view, usedKeys: message.keys }
    case 'waiting':
      return message.waiting
        ? { ...view, waiting: true, slow: false, waits: view.waits + 1 }
        : { ...view, waiting: false, slow: false }
    case 'unsupported':
      return { ...view, unsupported: true, notices: view.notices + 1 }
    case 'exit':
      return closed(view)
    case 'error':
      return closed(view, { failed: true })
  }
}

/** The view after one thing happens to it. */
export function dataBroadcastAfter(
  view: DataBroadcastView,
  step: DataBroadcastStep,
): DataBroadcastView {
  switch (step.on) {
    case 'toggle':
      if (view.open) {
        return closed(view)
      }

      return step.availability === 'ready' ? closed(view, { open: true }) : view
    case 'availability':
      return view.open && step.availability === 'none' ? closed(view) : view
    case 'runtime':
      return view.open ? heard(view, step.message) : view
    case 'slow':
      return view.waiting && view.waits === step.waits
        ? { ...view, slow: true }
        : view
    case 'faded':
      return view.unsupported && view.notices === step.notices
        ? { ...view, unsupported: false }
        : view
    case 'numbers':
      return view.open ? { ...view, numbers: step.shown } : view
    case 'quiet':
      return view.failed ? { ...view, failed: false } : view
  }
}

/** The one line the face says at its bottom, if any: an unsupported operation first, as it answers what was just pressed. */
export function dataBroadcastSays(view: DataBroadcastView): string | null {
  if (!view.open) {
    return null
  }

  if (view.unsupported) {
    return SAID_UNSUPPORTED
  }

  return view.slow ? SAID_RECEIVING : null
}

/** The transform that lays the picture box over a rectangle of the 960x540 grid, or none to leave it filling the box. */
export function pictureTransform(rect: Rect | null): string | undefined {
  if (!rect) {
    return undefined
  }

  const left = (rect.left / GRID.width) * 100
  const top = (rect.top / GRID.height) * 100

  return `translate(${left}%, ${top}%) scale(${rect.width / GRID.width}, ${rect.height / GRID.height})`
}
