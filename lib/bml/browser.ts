import {
  applicationToStart,
  hexIdOf,
  isAitUri,
  receivedAitOf,
  type AitApplication,
  type AppStart,
} from '@/lib/bml/ait'
import {
  ETHERNET_DHCP,
  IP_CONNECTED,
  MOST_CHARSET,
  MOST_TRANSMIT_TEXT,
  TRANSMIT_RESULT,
  answerOf,
  transmitted,
  type LineState,
  type ReceiverId,
  type TransmitAnswer,
} from '@/lib/bml/line'
import { readArray, writeArray, type PersistentMemory } from '@/lib/bml/memory'
import { lineAddressOf } from '@/lib/bml/paths'
import type { Programme } from '@/lib/bml/messages'
import {
  BROWSER_NAME,
  BROWSER_VERSION,
  DONE,
  FAILED,
  MAKER_ID,
} from '@/lib/bml/receiver-identity'
import { DocumentLeft } from '@/lib/bml/scripts'

export { BROWSER_NAME, BROWSER_VERSION, DONE, FAILED, MAKER_ID }

/** What locking a module came to: held already, awaited from the carousel, absent from the carousel (the document hears of it as `ModuleLocked` with status -2), carried by no component, or named badly. */
export type LockAnswer = 'held' | 'waiting' | 'absent' | 'noComponent' | 'bad'

/** What reading an AIT that a document asked to receive has come to: still being read, failed, or its applications. */
export type AitReception = 'waiting' | 'failed' | AitApplication[]

/** What the runtime gives `browser.*` to work with. */
export interface BrowserHost {
  launch(reference: unknown): boolean
  reload(): void
  activeDocument(): string | null
  relativeTime(): number | null
  npt(): number | null
  programme(): Programme | null
  hasComponent(tag: number): boolean
  listed(reference: unknown): boolean | null
  quit(): void
  memory: PersistentMemory
  registers: { Ureg: string[]; Greg: string[] }
  startTimer(code: unknown, everyMs: unknown, times: unknown): number
  stopTimer(id: unknown): boolean
  sleep(ms: unknown): void
  lock(reference: unknown): LockAnswer
  unlock(reference: unknown): void
  lockedModules(): { path: string; held: boolean }[]
  unsupported(what: string): void
  warn(what: string): void
  line(): LineState
  receiverId(): ReceiverId | null
  overTheLine(): boolean
  transmit(uri: string, text: string, charset: string): TransmitAnswer
  lineOff(what: string): void
  hybridcast(): boolean
  receiveAit(uri: string): boolean
  receivedAit(uri: string): AitReception | undefined
  readAit(uri: string): AitApplication[] | null
  startApplication(start: AppStart): void
  unopened(): void
  failedBefore(start: AppStart): boolean
}

/** The functions a broadcast's document may call and get an answer from. */
export const SUPPORTED_FUNCTIONS = [
  'launchDocument',
  'reloadActiveDocument',
  'quitDocument',
  'getActiveDocument',
  'getBrowserVersion',
  'getBrowserSupport',
  'getBrowserStatus',
  'getNPT',
  'getProgramRelativeTime',
  'setInterval',
  'clearTimer',
  'sleep',
  'addDate',
  'subDate',
  'getProgramID',
  'getTuningStatus',
  'detectComponent',
  'isBeingBroadcast',
  'isSupportedMedia',
  'getIRDID',
  'epgGetEventStartTime',
  'readPersistentArray',
  'writePersistentArray',
  'lockModuleOnMemory',
  'lockModuleOnMemoryEx',
  'unlockModuleOnMemory',
  'unlockModuleOnMemoryEx',
  'unlockAllModulesOnMemory',
  'getLockedModuleInfo',
  'random',
  'getResidentAppVersion',
  'startReceivingAIT',
  'getReceivedAIT',
  'startAITControlledApp',
] as const

/** Called, these do nothing and say they succeeded. */
export const IGNORED_FUNCTIONS = [
  'playRomSound',
  'setCurrentDateMode',
  'loadDRCS',
  'unloadDRCS',
  'setCachedResourceMode',
  'setFullDataDisplayArea',
  'lockScreen',
  'unlockScreen',
] as const

/** What a document asks of the line, the provider and the applications beyond the broadcast before it offers them: answered as a receiver without a line answers, with a warning and nothing told to the player, as the viewer has asked for nothing. While the line is used, `isIPConnected` and `getConnectionType` say it is there. */
export const UNCONNECTED_QUERIES = [
  'confirmIPNetwork',
  'isIPConnected',
  'getConnectionType',
  'getISPParams',
  'getDelayedTransmissionData',
  'X_DPA_getComBrowserUA',
] as const

/** Communication, the stored services and the applications beyond the broadcast: these fail, and the player is told the operation is not supported. */
export const REFUSED_FUNCTIONS = [
  'connect',
  'disconnect',
  'sendTextData',
  'receiveTextData',
  'sendTextDataOverIP',
  'setISPParams',
  'connectPPP',
  'connectPPPWithISPParams',
  'saveHttpServerFileAs',
  'saveHttpServerFile',
  'sendHttpServerFileAs',
  'setDelayedTransmissionData',
  'startResidentApp',
  'startExtraBrowser',
  'launchDocumentRestricted',
  'X_DPA_startResidentApp',
  'X_DPA_launchDocWithLink',
  'X_DPA_writeCproBM',
  'epgTune',
  'epgTuneToComponent',
  'epgTuneToDocument',
  'epgReserve',
  'epgCancelReservation',
  'epgRecReserve',
  'epgRecCancelReservation',
  'startEMMReception',
  'subscribe',
  'saveStorageFile',
  'loadStorageFile',
] as const

/** What uses the line: these work while it is used. Otherwise they fail, and the player is told the setting refuses the line, or, where there is none, that the operation is not supported. */
export const LINE_FUNCTIONS = [
  'transmitTextDataOverIP',
  'disconnectPPP',
] as const

/** What the queries about the line answer while it is used. */
const LINE_ANSWERS: Partial<Record<string, number>> = {
  isIPConnected: IP_CONNECTED,
  getConnectionType: ETHERNET_DHCP,
}

/** The groups of functions that use the line, supported while it is used: sending text over it and asking its type. Connecting by PPP and its parameters are not. */
const LINE_GROUPS = new Set(['Com.IP', 'Com.IP.Transmit', 'Com.IP.GetType'])

const SUPPORTED_GROUPS = new Set([
  'Ctrl.Basic',
  'Ctrl.Timer',
  'Ctrl.Timer2',
  'Ctrl.Version',
  'Ctrl.Cache',
  'Nvram.Basic',
  'Misc.Random',
])

/** The versions of the language a document may ask after and be told yes. */
const BML_VERSIONS = new Set(['1.0', '2.0', '3.0'])

/** The resident application `getResidentAppVersion` answers for while Hybridcast is allowed: the engine of the applications an AIT controls. */
const HYBRIDCAST_ENGINE = 'AITControlledApp'

/** What `getResidentAppVersion` answers for that engine: the maker, the model, the major and minor versions, and the name the IPTV Forum assigns, which this receiver has none of (IPTVFJ STD-0013 5.3.1). */
const HYBRIDCAST_ENGINE_VERSION = [
  MAKER_ID,
  BROWSER_NAME,
  BROWSER_VERSION[0],
  BROWSER_VERSION[1],
  '',
]

/** What `getBrowserSupport` is told yes to while Hybridcast is allowed: the group of functions that start an application, the HTML5 engine of phase 0, and the AIT in XML over HTTP (IPTVFJ STD-0010 appendix A.1). */
const HYBRIDCAST_SUPPORT: Partial<Record<string, readonly string[]>> = {
  AITControlledAppEngineFunction: ['IPTV-F', 'HTML5_ph0'],
  AITTransportMethod: ['XML', 'HTTP'],
}

const HYBRIDCAST_GROUP = 'AITControlledApp.Start'

/** What `getReceivedAIT` answers while the AIT is still being read, and when reading it failed. */
const NOT_RECEIVED_YET = 0

const NOT_RECEIVED = -1

export const REGISTERS = 64

/** What a document asks `getProgramID` for. */
export const PROGRAM_ID = {
  event: 1,
  service: 2,
  network: 3,
  stream: 4,
} as const

/** The units `addDate` and `subDate` count in: seconds to weeks, and milliseconds for anything else. */
const UNIT_MS: Record<number, number> = {
  1: 1000,
  2: 60_000,
  3: 3_600_000,
  4: 86_400_000,
  5: 604_800_000,
}

const COMPONENT = /^\/([0-9a-f]{2})(?:\/|$)/i

function hex(value: number): string {
  return `0x${value.toString(16).padStart(4, '0')}`
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0
}

type Answer = (...args: unknown[]) => unknown

function programmeId(host: BrowserHost, which: unknown): string | null {
  const programme = host.programme()

  if (!programme) {
    return null
  }

  const ids: Record<number, number | null> = {
    [PROGRAM_ID.event]: programme.event,
    [PROGRAM_ID.service]: programme.service,
    [PROGRAM_ID.network]: programme.network,
    [PROGRAM_ID.stream]: programme.stream,
  }
  const id = typeof which === 'number' ? ids[which] : undefined

  return typeof id === 'number' ? hex(id) : null
}

/** What a document may be told it can use: the line while it is used, and Hybridcast while the viewer allows it. */
interface Offered {
  line: LineState
  hybridcast: boolean
}

function groupSupported(group: unknown, offered: Offered): boolean {
  if (typeof group !== 'string') {
    return false
  }

  return (
    SUPPORTED_GROUPS.has(group) ||
    (offered.line === 'on' && LINE_GROUPS.has(group)) ||
    (offered.hybridcast && group === HYBRIDCAST_GROUP)
  )
}

function hybridcastSupported(name: unknown, info: unknown[]): boolean {
  const supported = typeof name === 'string' ? HYBRIDCAST_SUPPORT[name] : null

  return (
    !!supported &&
    info.length === supported.length &&
    supported.every((item, at) => info[at] === item)
  )
}

function supportOf(
  provider: unknown,
  name: unknown,
  info: unknown[],
  offered: Offered,
): number {
  if (provider !== 'ARIB') {
    return 0
  }

  switch (name) {
    case 'APIGroup':
      return Number(groupSupported(info[0], offered))
    case 'BMLversion':
      return info.length === 0 ||
        (typeof info[0] === 'string' && BML_VERSIONS.has(info[0]))
        ? 1
        : 0
    default:
      return Number(offered.hybridcast && hybridcastSupported(name, info))
  }
}

function msOf(date: unknown): number | null {
  const time =
    typeof date === 'object' &&
    date !== null &&
    typeof (date as Date).getTime === 'function'
      ? (date as Date).getTime()
      : Number.NaN

  return Number.isFinite(time) ? time : null
}

function unitOf(unit: unknown): number {
  return (typeof unit === 'number' && UNIT_MS[unit]) || 1
}

function addDate(date: unknown, offset: unknown, unit: unknown): unknown {
  const from = msOf(date)

  return from !== null && typeof offset === 'number' && Number.isFinite(offset)
    ? new Date(from + offset * unitOf(unit))
    : FAILED
}

function subDate(later: unknown, earlier: unknown, unit: unknown): number {
  const from = msOf(later)
  const to = msOf(earlier)

  return from !== null && to !== null
    ? Math.trunc((from - to) / unitOf(unit))
    : FAILED
}

function componentTag(reference: unknown): number | null {
  const found = typeof reference === 'string' ? COMPONENT.exec(reference) : null

  return found ? parseInt(found[1], 16) : null
}

const NO_COMPONENT = -3

/** The `getIRDID` type asked for, written as a number or as a string of one, such as `"0xE0001"`. */
function idTypeOf(type: unknown): number {
  if (typeof type === 'number') {
    return type
  }

  return typeof type === 'string' && type.trim() !== ''
    ? Number(type)
    : Number.NaN
}

/** The card's ID, only for the type that names the card's CA system (ARIB STD-B24 vol. 2), while the line is used and the viewer has allowed the ID to be handed over. */
function receiverIdFor(host: BrowserHost, type: unknown): string | null {
  const given = host.line() === 'on' ? host.receiverId() : null

  return given !== null && idTypeOf(type) === given.caSystemId
    ? given.cardId
    : null
}

/** Whether the document shown came over the line (`Link`) or with the broadcast (`Broadcast`), as `getBrowserStatus("TerrP", "IRDState", …)` asks. */
function irdState(host: BrowserHost, state: unknown): number {
  switch (state) {
    case 'Link':
      return Number(host.overTheLine())
    case 'Broadcast':
      return Number(!host.overTheLine())
    default:
      return FAILED
  }
}

function browserStatus(
  host: BrowserHost,
  provider: unknown,
  name: unknown,
  info: unknown,
): number {
  if (provider === 'TerrP' && name === 'IRDState') {
    return irdState(host, info)
  }

  host.warn(`unsupported browser status: ${String(provider)} ${String(name)}`)

  return FAILED
}

const BAD_ARGUMENT = transmitted(answerOf(TRANSMIT_RESULT.badArgument))

/** Sends text over the line and answers what came back. Where there is no line, it timed out; where the setting refuses the line, it failed as before. */
function transmit(
  host: BrowserHost,
  uri: unknown,
  text: unknown,
  charset: unknown,
): unknown {
  const line = host.line()

  if (line !== 'on') {
    return refuseTheLine(host, 'transmitTextDataOverIP')
  }

  const sent = text === undefined || text === null ? '' : text
  const address = typeof uri === 'string' ? lineAddressOf(uri) : null

  if (
    !address?.url ||
    typeof sent !== 'string' ||
    sent.length > MOST_TRANSMIT_TEXT ||
    typeof charset !== 'string' ||
    charset.length > MOST_CHARSET
  ) {
    return BAD_ARGUMENT
  }

  return transmitted(host.transmit(address.url, sent, charset))
}

/** A function that uses the line, called while it is not used: where there is none the player is told it is not supported and a transmission timed out; where the setting refuses it the player is told so and it fails. */
function refuseTheLine(host: BrowserHost, name: string): unknown {
  if (host.line() === 'off') {
    host.lineOff(name)

    return FAILED
  }

  host.unsupported(name)

  return name === 'transmitTextDataOverIP'
    ? transmitted(answerOf(TRANSMIT_RESULT.timedOut))
    : FAILED
}

/** What `getReceivedAIT` answers: the AIT as a document reads it once it is in, 0 while it is read or was never asked for, and -1 when reading it failed. Without an address it asks after an AIT of the broadcast, which this receiver does not watch. */
function receivedAit(host: BrowserHost, uri: unknown): unknown {
  if (!host.hybridcast()) {
    host.warn('not connected: getReceivedAIT')

    return FAILED
  }

  if (!isAitUri(uri)) {
    return FAILED
  }

  const reception = host.receivedAit(uri)

  if (reception === 'failed') {
    return NOT_RECEIVED
  }

  return Array.isArray(reception) ? receivedAitOf(reception) : NOT_RECEIVED_YET
}

function receiveAit(host: BrowserHost, uri: unknown): number {
  if (!host.hybridcast()) {
    host.unsupported('startReceivingAIT')

    return FAILED
  }

  if (!isAitUri(uri)) {
    return FAILED
  }

  return host.receiveAit(uri) ? DONE : FAILED
}

/** The application to start, named by a document: the AIT by its address and both identifiers in hexadecimal, or null when one of them is not that. */
function startOf(
  orgId: unknown,
  appId: unknown,
  uri: unknown,
): AppStart | null {
  const org = hexIdOf(orgId)
  const app = hexIdOf(appId)

  return org !== null && app !== null && isAitUri(uri)
    ? { ait: uri, orgId: org, appId: app }
    : null
}

/** Reads the AIT again and asks the player to start the application both identifiers name, when it is one to start by itself; the script goes no further. Otherwise it fails and the player is told the application did not open. One that failed to start before is not tried again. */
function startApplication(
  host: BrowserHost,
  orgId: unknown,
  appId: unknown,
  uri: unknown,
): unknown {
  if (!host.hybridcast()) {
    host.unsupported('startAITControlledApp')

    return FAILED
  }

  const start = startOf(orgId, appId, uri)
  const applications =
    start && !host.failedBefore(start) ? host.readAit(start.ait) : null
  const found =
    start && applications
      ? applicationToStart(applications, start.orgId, start.appId)
      : null

  if (!start || !found) {
    host.unopened()

    return FAILED
  }

  host.startApplication(start)

  throw new DocumentLeft()
}

function lockAnswerOf(host: BrowserHost, reference: unknown): number {
  const answer = host.lock(reference)

  if (answer === 'bad') {
    return FAILED
  }

  return answer === 'noComponent' ? NO_COMPONENT : DONE
}

function supported(host: BrowserHost): Record<string, Answer> {
  return {
    launchDocument: (reference: unknown) => {
      if (!host.launch(reference)) {
        return FAILED
      }

      throw new DocumentLeft()
    },
    reloadActiveDocument: () => {
      host.reload()

      throw new DocumentLeft()
    },
    quitDocument: () => {
      host.quit()

      throw new DocumentLeft()
    },
    getActiveDocument: () => host.activeDocument(),
    getBrowserVersion: () => [BROWSER_NAME, ...BROWSER_VERSION],
    getBrowserSupport: (provider: unknown, name: unknown, ...info: unknown[]) =>
      supportOf(provider, name, info, {
        line: host.line(),
        hybridcast: host.hybridcast(),
      }),
    getBrowserStatus: (provider: unknown, name: unknown, info: unknown) =>
      browserStatus(host, provider, name, info),
    getNPT: () => host.npt() ?? FAILED,
    getProgramRelativeTime: () => host.relativeTime() ?? FAILED,
    setInterval: (code: unknown, everyMs: unknown, times: unknown) =>
      host.startTimer(code, everyMs, times),
    clearTimer: (id: unknown) => (host.stopTimer(id) ? DONE : FAILED),
    sleep: (ms: unknown) => {
      host.sleep(ms)

      return DONE
    },
    addDate,
    subDate,
    getProgramID: (which: unknown) => programmeId(host, which),
    getTuningStatus: () => 1,
    detectComponent: (reference: unknown) => {
      const tag = componentTag(reference)

      return tag === null ? FAILED : Number(host.hasComponent(tag))
    },
    isBeingBroadcast: (reference: unknown) => {
      if (reference === 'HTTPServer') {
        return Number(host.overTheLine())
      }

      const listed = host.listed(reference)

      return listed === null ? FAILED : Number(listed)
    },
    isSupportedMedia: () => 0,
    getIRDID: (type: unknown) => receiverIdFor(host, type),
    transmitTextDataOverIP: (uri: unknown, text: unknown, charset: unknown) =>
      transmit(host, uri, text, charset),
    disconnectPPP: () =>
      host.line() === 'on' ? DONE : refuseTheLine(host, 'disconnectPPP'),
    epgGetEventStartTime: () => {
      const startsAt = host.programme()?.startsAt

      return typeof startsAt === 'number' ? new Date(startsAt * 1000) : null
    },
    readPersistentArray: (name: unknown, structure: unknown) =>
      readArray(host.memory, name, structure),
    writePersistentArray: (name: unknown, structure: unknown, data: unknown) =>
      writeArray(host.memory, name, structure, data) ? DONE : FAILED,
    lockModuleOnMemory: (reference: unknown) => lockAnswerOf(host, reference),
    lockModuleOnMemoryEx: (reference: unknown) => lockAnswerOf(host, reference),
    unlockModuleOnMemory: (reference: unknown) => {
      host.unlock(reference)

      return DONE
    },
    unlockModuleOnMemoryEx: (reference: unknown) => {
      host.unlock(reference)

      return DONE
    },
    unlockAllModulesOnMemory: () => {
      host.unlock(null)

      return DONE
    },
    getLockedModuleInfo: () =>
      host
        .lockedModules()
        .map((module) => [module.path, 2, module.held ? 1 : 2]),
    random: (most: unknown) =>
      1 + Math.floor(Math.random() * Math.max(1, count(most))),
    getResidentAppVersion: (name: unknown) =>
      name === HYBRIDCAST_ENGINE && host.hybridcast()
        ? [...HYBRIDCAST_ENGINE_VERSION]
        : DONE,
    startReceivingAIT: (uri: unknown) => receiveAit(host, uri),
    getReceivedAIT: (uri: unknown) => receivedAit(host, uri),
    startAITControlledApp: (orgId: unknown, appId: unknown, uri: unknown) =>
      startApplication(host, orgId, appId, uri),
  }
}

/** Fresh registers, empty strings all. */
export function registersOf(): string[] {
  return Array.from({ length: REGISTERS }, () => '')
}

/** The `browser` object a document sees. A function it does not know of is still callable: it warns and fails, so the script goes on. */
export function browserOf(host: BrowserHost): object {
  const known: Record<string, unknown> = {
    ...supported(host),
    Ureg: host.registers.Ureg,
    Greg: host.registers.Greg,
  }

  IGNORED_FUNCTIONS.forEach((name) => {
    known[name] = () => DONE
  })
  UNCONNECTED_QUERIES.forEach((name) => {
    known[name] = () => {
      const answer = LINE_ANSWERS[name]

      if (answer !== undefined && host.line() === 'on') {
        return answer
      }

      host.warn(`not connected: ${name}`)

      return FAILED
    }
  })
  REFUSED_FUNCTIONS.forEach((name) => {
    known[name] = () => {
      host.unsupported(name)

      return FAILED
    }
  })

  return new Proxy(known, {
    get(target, name) {
      if (typeof name !== 'string') {
        return undefined
      }

      if (Object.prototype.hasOwnProperty.call(target, name)) {
        return target[name]
      }

      return () => {
        host.warn(`unsupported browser function: ${name}`)

        return FAILED
      }
    },
    set() {
      return true
    },
    has(target, name) {
      return (
        typeof name === 'string' &&
        Object.prototype.hasOwnProperty.call(target, name)
      )
    },
  })
}
