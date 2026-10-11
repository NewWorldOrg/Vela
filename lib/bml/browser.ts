import { readArray, writeArray, type PersistentMemory } from '@/lib/bml/memory'
import type { Programme } from '@/lib/bml/messages'
import { DocumentLeft } from '@/lib/bml/scripts'

export type LockAnswer = 'held' | 'waiting' | 'bad'

/** What the runtime gives `browser.*` to work with. */
export interface BrowserHost {
  launch(reference: unknown): boolean
  reload(): void
  activeDocument(): string | null
  relativeTime(): number | null
  npt(): number | null
  programme(): Programme | null
  memory: PersistentMemory
  registers: { Ureg: string[]; Greg: string[] }
  startTimer(code: unknown, everyMs: unknown, times: unknown): number
  stopTimer(id: unknown): boolean
  sleep(ms: unknown): void
  lock(reference: unknown): LockAnswer
  unlock(reference: unknown): void
  lockedModules(): string[]
  unsupported(what: string): void
  warn(what: string): void
}

/** The functions a broadcast's document may call and get an answer from. */
export const SUPPORTED_FUNCTIONS = [
  'launchDocument',
  'reloadActiveDocument',
  'getActiveDocument',
  'getBrowserVersion',
  'getBrowserSupport',
  'getBrowserStatus',
  'getNPT',
  'getProgramRelativeTime',
  'setInterval',
  'clearTimer',
  'sleep',
  'getProgramID',
  'getTuningStatus',
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
] as const

/** Communication and the stored services: these fail, and the player is told the operation is not supported. */
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
  'saveHttpServerFileAs',
  'saveHttpServerFile',
  'sendHttpServerFileAs',
  'setDelayedTransmissionData',
  'getDelayedTransmissionData',
  'startResidentApp',
  'startExtraBrowser',
  'launchDocumentRestricted',
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

/** The 1 a function answers when it did what was asked. */
export const DONE = 1

/** The NaN a function answers when it could not do what was asked. */
export const FAILED = Number.NaN

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

  if (which === PROGRAM_ID.service) {
    return hex(programme.service)
  }

  return which === PROGRAM_ID.event && programme.event !== null
    ? hex(programme.event)
    : null
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
    getActiveDocument: () => host.activeDocument(),
    getBrowserVersion: () => [BROWSER_NAME, ...BROWSER_VERSION],
    getBrowserSupport: (provider: unknown, group: unknown) =>
      provider === 'ARIB' &&
      typeof group === 'string' &&
      SUPPORTED_GROUPS.has(group)
        ? 1
        : 0,
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
    getProgramID: (which: unknown) => programmeId(host, which),
    getTuningStatus: () => 1,
    epgGetEventStartTime: () => {
      const startsAt = host.programme()?.startsAt

      return typeof startsAt === 'number' ? new Date(startsAt * 1000) : null
    },
    readPersistentArray: (name: unknown, structure: unknown) =>
      readArray(host.memory, name, structure),
    writePersistentArray: (name: unknown, structure: unknown, data: unknown) =>
      writeArray(host.memory, name, structure, data) ? DONE : FAILED,
    lockModuleOnMemory: (reference: unknown) =>
      host.lock(reference) === 'bad' ? FAILED : DONE,
    lockModuleOnMemoryEx: (reference: unknown) =>
      host.lock(reference) === 'bad' ? FAILED : DONE,
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
      host.lockedModules().map((module) => [module, 1, 1]),
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
