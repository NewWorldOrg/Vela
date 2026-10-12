import { readArray, writeArray, type PersistentMemory } from '@/lib/bml/memory'
import type { Programme } from '@/lib/bml/messages'
import { DocumentLeft } from '@/lib/bml/scripts'

/** What locking a module came to: held already, awaited from the carousel, absent from the carousel (the document hears of it as `ModuleLocked` with status -2), carried by no component, or named badly. */
export type LockAnswer = 'held' | 'waiting' | 'absent' | 'noComponent' | 'bad'

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
] as const

/** Called, these do nothing and say they succeeded. */
export const IGNORED_FUNCTIONS = [
  'playRomSound',
  'setCurrentDateMode',
  'loadDRCS',
  'unloadDRCS',
  'setCachedResourceMode',
  'setFullDataDisplayArea',
  'getResidentAppVersion',
  'lockScreen',
  'unlockScreen',
] as const

/** Communication, the stored services and the applications beyond the broadcast: these fail, and the player is told the operation is not supported. */
export const REFUSED_FUNCTIONS = [
  'connect',
  'disconnect',
  'sendTextData',
  'receiveTextData',
  'transmitTextDataOverIP',
  'sendTextDataOverIP',
  'confirmIPNetwork',
  'isIPConnected',
  'getConnectionType',
  'setISPParams',
  'getISPParams',
  'connectPPP',
  'connectPPPWithISPParams',
  'disconnectPPP',
  'saveHttpServerFileAs',
  'saveHttpServerFile',
  'sendHttpServerFileAs',
  'setDelayedTransmissionData',
  'getDelayedTransmissionData',
  'startResidentApp',
  'startExtraBrowser',
  'launchDocumentRestricted',
  'startAITControlledApp',
  'startReceivingAIT',
  'getReceivedAIT',
  'X_DPA_startResidentApp',
  'X_DPA_launchDocWithLink',
  'X_DPA_getComBrowserUA',
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

export const BROWSER_NAME = 'Vela'

export const BROWSER_VERSION = ['1', '0', '0']

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

/** The 1 a function answers when it did what was asked. */
export const DONE = 1

/** The NaN a function answers when it could not do what was asked. */
export const FAILED = Number.NaN

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

function supportOf(provider: unknown, name: unknown, info: unknown[]): number {
  if (provider !== 'ARIB') {
    return 0
  }

  switch (name) {
    case 'APIGroup':
      return typeof info[0] === 'string' && SUPPORTED_GROUPS.has(info[0])
        ? 1
        : 0
    case 'BMLversion':
      return info.length === 0 ||
        (typeof info[0] === 'string' && BML_VERSIONS.has(info[0]))
        ? 1
        : 0
    default:
      return 0
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
      supportOf(provider, name, info),
    getBrowserStatus: (provider: unknown, name: unknown) => {
      host.warn(
        `unsupported browser status: ${String(provider)} ${String(name)}`,
      )

      return FAILED
    },
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
      const listed = host.listed(reference)

      return listed === null ? FAILED : Number(listed)
    },
    isSupportedMedia: () => 0,
    getIRDID: () => null,
    epgGetEventStartTime: () => {
      const startsAt = host.programme()?.startsAt

      return typeof startsAt === 'number' ? new Date(startsAt * 1000) : null
    },
    readPersistentArray: (name: unknown, structure: unknown) =>
      readArray(host.memory, name, structure),
    writePersistentArray: (name: unknown, structure: unknown, data: unknown) =>
      writeArray(host.memory, name, structure, data) ? DONE : FAILED,
    lockModuleOnMemory: (reference: unknown) => lockAnswerOf(host, reference),
    lockModuleOnMemoryEx: (reference: unknown) =>
      lockAnswerOf(host, reference),
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
