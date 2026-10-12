import type { Rect } from '@/lib/caption-placement'
import { keysOf, type BmlKey } from '@/lib/bml/keys'
import type { LineSaid, RuntimeMessage, ScriptState } from '@/lib/bml/messages'
import { MOST_RUN_MS } from '@/lib/bml/scripts'
import { GRID } from '@/lib/bml/style'
import type { DataBroadcastAvailability } from '@/lib/data-broadcast-feed'

export const SAID_RECEIVING = 'ページを受信しています。'

export const SAID_UNSUPPORTED = 'この操作には対応していません。'

export const SAID_FAILED = 'データ放送を表示できませんでした。'

export const SAID_LINE_OFF = '通信は設定で切になっています。'

export const SAID_UNREACHED = '放送局のサーバにつながりませんでした。'

/** How long a word about the line stays: as long as one about an unsupported operation. */
export const LINE_SAID_LASTS_MS = 3000

export const RECEIVING_SAID_AFTER_MS = 3000

export const UNSUPPORTED_LASTS_MS = 3000

/** How long a script may run before the frame is given up on: the runtime's own limit. */
export const SCRIPT_GIVEN_UP_AFTER_MS = MOST_RUN_MS

/** The keys a document takes until it says otherwise: `basic` and `data-button`. */
export const KEYS_UNTIL_TOLD = keysOf(['basic', 'data-button'])

/** What the player shows of a data broadcast. `waits`, `notices`, `lineNotices` and `scripting` name the latest wait, notice, word about the line and script run, so a timer started for one of them cannot end a later one. `lineOffSaid` is whether the setting refusing the line has been said while open, as it is said once. */
export interface DataBroadcastView {
  open: boolean
  rect: Rect | null
  usedKeys: readonly BmlKey[]
  waiting: boolean
  slow: boolean
  unsupported: boolean
  failed: boolean
  numbers: boolean
  line: LineSaid | null
  lineOffSaid: boolean
  waits: number
  notices: number
  lineNotices: number
  scripting: number
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
  line: null,
  lineOffSaid: false,
  waits: 0,
  notices: 0,
  lineNotices: 0,
  scripting: 0,
}

function closed(
  view: DataBroadcastView,
  over: Partial<DataBroadcastView> = {},
): DataBroadcastView {
  return {
    ...DATA_BROADCAST_CLOSED,
    waits: view.waits,
    notices: view.notices,
    lineNotices: view.lineNotices,
    ...over,
  }
}

export type DataBroadcastStep =
  | { on: 'toggle'; availability: DataBroadcastAvailability }
  | { on: 'autoStart'; availability: DataBroadcastAvailability }
  | { on: 'availability'; availability: DataBroadcastAvailability }
  | { on: 'runtime'; message: RuntimeMessage; nth?: number }
  | { on: 'slow'; waits: number }
  | { on: 'faded'; notices: number }
  | { on: 'lineFaded'; lineNotices: number }
  | { on: 'overran'; scripting: number }
  | { on: 'numbers'; shown: boolean }
  | { on: 'quiet' }

/** What decides whether the broadcast opens by itself: the setting, what the catalog asks, whether it can be opened, and whether it was open during this programme already, as one closed by hand stays closed until the programme changes. */
export interface AutoOpening {
  autoOpens: boolean
  autoStart: boolean
  availability: DataBroadcastAvailability
  openedThisProgramme: boolean
}

export function opensByItself(
  view: DataBroadcastView,
  asked: AutoOpening,
): boolean {
  return (
    asked.autoOpens &&
    asked.autoStart &&
    asked.availability === 'ready' &&
    !view.open &&
    !asked.openedThisProgramme
  )
}

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
  nth: number | undefined,
): DataBroadcastView {
  switch (message.kind) {
    case 'videoRect':
      return { ...view, rect: message.rect }
    case 'usedKeys':
      return { ...view, usedKeys: message.keys }
    case 'waiting':
      return message.waiting
        ? { ...view, waiting: true, slow: false, waits: nth ?? view.waits + 1 }
        : { ...view, waiting: false, slow: false }
    case 'unsupported':
      return { ...view, unsupported: true, notices: nth ?? view.notices + 1 }
    case 'line':
      return saidOfTheLine(view, message.said, nth)
    case 'transmit':
    case 'fetch':
      return view
    case 'script':
      return scripted(view, message.state, nth)
    case 'memory':
      return view
    case 'exit':
      return closed(view)
    case 'error':
      return closed(view, { failed: true })
  }
}

/** A word about the line: the setting refusing it is said once while open, the server not reached each time it is not. */
function saidOfTheLine(
  view: DataBroadcastView,
  said: LineSaid,
  nth: number | undefined,
): DataBroadcastView {
  if (said === 'off' && view.lineOffSaid) {
    return view
  }

  return {
    ...view,
    line: said,
    lineOffSaid: view.lineOffSaid || said === 'off',
    lineNotices: nth ?? view.lineNotices + 1,
  }
}

/** A script run that starts is remembered until it ends; one the runtime says overran closes the broadcast as broken, as the frame is remade around it. */
function scripted(
  view: DataBroadcastView,
  state: ScriptState,
  nth: number | undefined,
): DataBroadcastView {
  switch (state) {
    case 'running':
      return { ...view, scripting: nth ?? view.scripting + 1 }
    case 'done':
      return { ...view, scripting: 0 }
    case 'overran':
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
    case 'autoStart':
      return !view.open && step.availability === 'ready'
        ? closed(view, { open: true })
        : view
    case 'availability':
      return view.open && step.availability === 'none' ? closed(view) : view
    case 'runtime':
      return view.open ? heard(view, step.message, step.nth) : view
    case 'slow':
      return view.waiting && view.waits === step.waits
        ? { ...view, slow: true }
        : view
    case 'faded':
      return view.unsupported && view.notices === step.notices
        ? { ...view, unsupported: false }
        : view
    case 'lineFaded':
      return view.line !== null && view.lineNotices === step.lineNotices
        ? { ...view, line: null }
        : view
    case 'overran':
      return view.open && view.scripting === step.scripting
        ? closed(view, { failed: true })
        : view
    case 'numbers':
      return view.open ? { ...view, numbers: step.shown } : view
    case 'quiet':
      return view.failed ? { ...view, failed: false } : view
  }
}

const SAID_OF_THE_LINE: Record<LineSaid, string> = {
  off: SAID_LINE_OFF,
  unreached: SAID_UNREACHED,
}

/** The one line the face says at its bottom, if any: an unsupported operation first, as it answers what was just pressed, then a word about the line. */
export function dataBroadcastSays(view: DataBroadcastView): string | null {
  if (!view.open) {
    return null
  }

  if (view.unsupported) {
    return SAID_UNSUPPORTED
  }

  if (view.line) {
    return SAID_OF_THE_LINE[view.line]
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
