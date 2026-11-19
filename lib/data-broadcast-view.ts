import type { Rect } from '@/lib/caption-placement'
import type { AppStart } from '@/lib/bml/ait'
import { keysOf, type BmlKey } from '@/lib/bml/keys'
import {
  MOST_FAILED_STARTS,
  type LineSaid,
  type RuntimeMessage,
  type ScriptState,
} from '@/lib/bml/messages'
import { MOST_RUN_MS } from '@/lib/bml/run-limit'
import { GRID } from '@/lib/bml/style'
import type { DataBroadcastAvailability } from '@/lib/data-broadcast-feed'
import { KEY_SET_UNTIL_TOLD, keysOfKeySet } from '@/lib/hybridcast/keys'
import { APP_SIZE, type OwnedApplication } from '@/lib/hybridcast/messages'

export const SAID_RECEIVING = 'ページを受信しています。'

export const SAID_UNSUPPORTED = 'この操作には対応していません。'

export const SAID_FAILED = 'データ放送を表示できませんでした。'

export const SAID_LINE_OFF = '通信は設定で切になっています。'

export const SAID_UNREACHED = '放送局のサーバにつながりませんでした。'

export const SAID_UNOPENED = 'Hybridcast のアプリを開けませんでした。'

export const UNOPENED_LASTS_MS = 3000

export const LINE_SAID_LASTS_MS = 3000

export const RECEIVING_SAID_AFTER_MS = 3000

export const UNSUPPORTED_LASTS_MS = 3000

export const SCRIPT_GIVEN_UP_AFTER_MS = MOST_RUN_MS

export const KEYS_UNTIL_TOLD = keysOf(['basic', 'data-button'])

export const APP_KEYS_UNTIL_TOLD = keysOfKeySet(KEY_SET_UNTIL_TOLD)

export type AppEnd =
  | { why: 'viewer' }
  | { why: 'destroyed' }
  | { why: 'toTheDocuments'; componentTag: number | null }
  | { why: 'outsideTheBoundary'; to: string }
  | { why: 'offTheRelay'; after: string | null; hello: boolean }
  | { why: 'unopened'; hello: boolean }
  | { why: 'refused' }
  | { why: 'broadcastEnded' }
  | { why: 'notAllowed' }
  | { why: 'channelChanged' }

function siteOf(address: string | null): string {
  if (address === null) {
    return 'an address not known'
  }

  try {
    const url = new URL(address)

    return `${url.origin}${url.pathname}`
  } catch {
    return 'an address not known'
  }
}

const NOT_ON_THE_RELAY: Record<'true' | 'false', string> = {
  false:
    'did not say hello: it did not load, or the receiver script did not run in it',
  true: 'said hello but did not answer once it had loaded',
}

export function appEndSaid(end: AppEnd): string {
  switch (end.why) {
    case 'viewer':
      return 'Hybridcast: closed by the viewer'
    case 'destroyed':
      return 'Hybridcast: closed, as the application called destroyApplication'
    case 'toTheDocuments':
      return end.componentTag === null
        ? 'Hybridcast: closed, as the application went back to the data broadcast'
        : `Hybridcast: closed, as the application went back to the data broadcast at component 0x${end.componentTag.toString(16).padStart(2, '0')}`
    case 'outsideTheBoundary':
      return `Hybridcast: closed, as the application went to ${siteOf(end.to)}, outside its boundary`
    case 'offTheRelay':
      return `Hybridcast: closed, as a document loaded in the frame after ${siteOf(end.after)} ${NOT_ON_THE_RELAY[String(end.hello) as 'true' | 'false']}`
    case 'unopened':
      return `Hybridcast: did not open, as its first document ${NOT_ON_THE_RELAY[String(end.hello) as 'true' | 'false']}`
    case 'refused':
      return 'Hybridcast: did not open, as the relay did not start the application'
    case 'broadcastEnded':
      return 'Hybridcast: closed, as the data broadcast was closed or ended'
    case 'notAllowed':
      return 'Hybridcast: closed, as Hybridcast is no longer allowed in the settings'
    case 'channelChanged':
      return 'Hybridcast: closed, as the channel changed or the stream was started again'
  }
}

export interface HybridcastApp {
  start: AppStart
  nth: number
  address: string | null
  application: OwnedApplication | null
}

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
  hybridcast: HybridcastApp | null
  greg: readonly string[] | null
  unopened: boolean
  unopenedSaid: boolean
  appNotices: number
  failedStarts: readonly AppStart[]
  returns: number
  startup: string | null
  appEnded: AppEnd | null
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
  hybridcast: null,
  greg: null,
  unopened: false,
  unopenedSaid: false,
  appNotices: 0,
  failedStarts: [],
  returns: 0,
  startup: null,
  appEnded: null,
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
    appNotices: view.appNotices,
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
  | {
      on: 'appStarted'
      nth: number
      address: string
      application: OwnedApplication
    }
  | { on: 'appUnopened'; nth: number }
  | { on: 'appClosed'; startup?: string | null; why?: AppEnd }
  | { on: 'appFaded'; appNotices: number }
  | { on: 'appRect'; rect: Rect | null }
  | { on: 'appKeys'; mask: number }
  | { on: 'appGreg'; greg: readonly string[] }
  | { on: 'appReplaced'; start: AppStart; nth: number }
  | { on: 'appLost'; end: AppEnd; nth: number }

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
    case 'ait':
      return view
    case 'startApp':
      return {
        ...view,
        hybridcast: {
          start: message.start,
          nth: nth ?? 0,
          address: null,
          application: null,
        },
        greg: message.greg,
        rect: null,
        usedKeys: APP_KEYS_UNTIL_TOLD,
        waiting: false,
        slow: false,
        unsupported: false,
        line: null,
        unopened: false,
      }
    case 'unopened':
      return saidUnopened(view, nth)
    case 'script':
      return scripted(view, message.state, nth)
    case 'memory':
    case 'romsound':
      return view
    case 'exit':
      return closed(view)
    case 'error':
      return closed(view, { failed: true })
  }
}

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

function saidUnopened(
  view: DataBroadcastView,
  nth: number | undefined,
): DataBroadcastView {
  return view.unopenedSaid
    ? view
    : {
        ...view,
        unopened: true,
        unopenedSaid: true,
        appNotices: nth ?? view.appNotices + 1,
      }
}

function backToTheDocuments(
  view: DataBroadcastView,
  end: AppEnd,
  startup: string | null = null,
): DataBroadcastView {
  return view.hybridcast
    ? {
        ...view,
        hybridcast: null,
        returns: view.returns + 1,
        rect: null,
        usedKeys: KEYS_UNTIL_TOLD,
        startup,
        appEnded: end,
      }
    : view
}

export function startupOf(componentTag: number): string {
  return `/${componentTag.toString(16).padStart(2, '0')}/0000/startup.bml`
}

export function gridRectOfApp(rect: Rect | null): Rect | null {
  if (!rect) {
    return null
  }

  const across = GRID.width / APP_SIZE.width
  const down = GRID.height / APP_SIZE.height

  return {
    left: rect.left * across,
    top: rect.top * down,
    width: rect.width * across,
    height: rect.height * down,
  }
}

function unopenedApp(
  view: DataBroadcastView,
  nth: number,
  end: AppEnd,
): DataBroadcastView {
  const app = view.hybridcast

  if (!app) {
    return view
  }

  return saidUnopened(
    {
      ...backToTheDocuments(view, end),
      failedStarts: [...view.failedStarts, app.start].slice(
        -MOST_FAILED_STARTS,
      ),
    },
    nth,
  )
}

type AppStep = Extract<
  DataBroadcastStep,
  {
    on:
      | 'appStarted'
      | 'appUnopened'
      | 'appClosed'
      | 'appFaded'
      | 'appRect'
      | 'appKeys'
      | 'appGreg'
      | 'appReplaced'
      | 'appLost'
  }
>

function runningAppAfter(
  view: DataBroadcastView,
  step: Extract<
    AppStep,
    { on: 'appRect' | 'appKeys' | 'appGreg' | 'appReplaced' }
  >,
): DataBroadcastView {
  if (!view.hybridcast) {
    return view
  }

  switch (step.on) {
    case 'appRect':
      return { ...view, rect: gridRectOfApp(step.rect) }
    case 'appKeys':
      return { ...view, usedKeys: keysOfKeySet(step.mask) }
    case 'appGreg':
      return { ...view, greg: step.greg }
    case 'appReplaced':
      return {
        ...view,
        hybridcast: {
          start: step.start,
          nth: step.nth,
          address: null,
          application: null,
        },
        rect: null,
        usedKeys: APP_KEYS_UNTIL_TOLD,
      }
  }
}

function appAfter(view: DataBroadcastView, step: AppStep): DataBroadcastView {
  switch (step.on) {
    case 'appStarted':
      return view.hybridcast?.nth === step.nth
        ? {
            ...view,
            hybridcast: {
              ...view.hybridcast,
              address: step.address,
              application: step.application,
            },
          }
        : view
    case 'appUnopened':
      return view.hybridcast?.nth === step.nth
        ? unopenedApp(view, step.nth, { why: 'refused' })
        : view
    case 'appLost':
      return step.end.why === 'unopened'
        ? unopenedApp(view, step.nth, step.end)
        : backToTheDocuments(view, step.end)
    case 'appClosed':
      return backToTheDocuments(
        view,
        step.why ?? { why: 'viewer' },
        step.startup ?? null,
      )
    case 'appFaded':
      return view.unopened && view.appNotices === step.appNotices
        ? { ...view, unopened: false }
        : view
    default:
      return runningAppAfter(view, step)
  }
}

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

export function dataBroadcastAfter(
  view: DataBroadcastView,
  step: DataBroadcastStep,
): DataBroadcastView {
  switch (step.on) {
    case 'toggle':
      if (view.hybridcast) {
        return backToTheDocuments(view, { why: 'viewer' })
      }

      if (view.open) {
        return closed(view)
      }

      return step.availability === 'ready' ? closed(view, { open: true }) : view
    case 'autoStart':
      return !view.open && step.availability === 'ready'
        ? closed(view, { open: true })
        : view
    case 'availability':
      if (!view.open || step.availability !== 'none') {
        return view
      }

      return closed(
        view,
        view.hybridcast ? { appEnded: { why: 'broadcastEnded' } } : {},
      )
    case 'runtime':
      return view.open && !view.hybridcast
        ? heard(view, step.message, step.nth)
        : view
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
    case 'appStarted':
    case 'appUnopened':
    case 'appClosed':
    case 'appFaded':
    case 'appRect':
    case 'appKeys':
    case 'appGreg':
    case 'appReplaced':
    case 'appLost':
      return view.open ? appAfter(view, step) : view
  }
}

const SAID_OF_THE_LINE: Record<LineSaid, string> = {
  off: SAID_LINE_OFF,
  unreached: SAID_UNREACHED,
}

export function dataBroadcastSays(view: DataBroadcastView): string | null {
  if (!view.open) {
    return null
  }

  if (view.unsupported) {
    return SAID_UNSUPPORTED
  }

  if (view.unopened) {
    return SAID_UNOPENED
  }

  if (view.line) {
    return SAID_OF_THE_LINE[view.line]
  }

  return view.slow ? SAID_RECEIVING : null
}

export function pictureTransform(rect: Rect | null): string | undefined {
  if (!rect) {
    return undefined
  }

  const left = (rect.left / GRID.width) * 100
  const top = (rect.top / GRID.height) * 100

  return `translate(${left}%, ${top}%) scale(${rect.width / GRID.width}, ${rect.height / GRID.height})`
}

export type BandPlace = 'column' | 'under' | 'over' | 'dock'

export function bandPlace(
  full: boolean,
  column: boolean,
  docked = false,
): BandPlace {
  if (full) {
    return 'over'
  }

  if (docked) {
    return 'dock'
  }

  return column ? 'column' : 'under'
}
