import type { Rect } from '@/lib/caption-placement'
import { hexIdOf, isAitUri } from '@/lib/bml/ait'
import {
  BROWSER_NAME,
  BROWSER_VERSION,
  DONE,
  FAILED,
  MAKER_ID,
} from '@/lib/bml/browser'
import type { BroadcastEvent } from '@/lib/bml/event-message'
import { privateDataOf } from '@/lib/bml/events'
import type { BmlKey } from '@/lib/bml/keys'
import type { ReceiverId } from '@/lib/bml/line'
import { PersistentMemory, readArray, writeArray } from '@/lib/bml/memory'
import { MOST_REGISTER, SHARED_REGISTERS } from '@/lib/bml/messages'
import { nptMilliseconds, type NptReading } from '@/lib/bml/npt'
import { bitmapAt, permits, type Permission } from '@/lib/hybridcast/boundary'
import {
  eventInformationAnswer,
  sameEventOnAir,
  type EventInformation,
} from '@/lib/hybridcast/event-information'
import {
  KEY_SET,
  KEY_SET_UNTIL_TOLD,
  keySetOf,
  keysOfKeySet,
} from '@/lib/hybridcast/keys'
import type {
  AppMessage,
  AppState,
  ReceiverMessage,
} from '@/lib/hybridcast/messages'

/** What the receiver needs of the frame it runs in: the broadcaster's URL of the document, the state the frame carried in, a way to say things to the player, to carry the state on to the next document, to warn, the clock, and timers. */
export interface ReceiverEnvironment {
  documentAt: string
  state: AppState
  say(message: AppMessage): void
  keep(state: AppState): void
  warn(text: string): void
  now(): number
  setTimeout(run: () => void, ms: number): number
  clearTimeout(id: number): void
}

type Listener = (value: unknown) => void

interface Filtered {
  tag: number | null
  group: number | null
  id: number | null
  listener: Listener
}

interface Alarm {
  tag: number | null
  at: number
  listener: Listener
  timer: number | null
}

interface HeldNpt {
  reading: NptReading
  takenAt: number
}

/** The most listeners of one kind an application may add, and alarms it may set. */
export const MOST_LISTENERS = 64

/** The functions this receiver does not offer, which answer that they failed: choosing a service, leaving the AIT's management, widening the boundary, and the companion devices. */
export const UNOFFERED = [
  'tuneTo',
  'exitFromManagedState',
  'addPermissionManagedArea',
  'setURLForCompanionDevice',
  'clearURLForCompanionDevice',
  'getCompanionDeviceList',
  'sendTextToCompanionDevice',
  'addCompanionDeviceTextMessageListener',
  'removeCompanionDeviceTextMessageListener',
] as const

function recordOf(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null
}

function byteOrNull(value: unknown, most: number): number | null {
  return Number.isInteger(value) &&
    (value as number) >= 0 &&
    (value as number) <= most
    ? (value as number)
    : null
}

function tagOf(filter: unknown): number | null {
  return byteOrNull(recordOf(recordOf(filter)?.es_ref)?.component_tag, 0xff)
}

function filteredOf(filter: unknown, listener: Listener): Filtered {
  const given = recordOf(filter)

  return {
    tag: tagOf(filter),
    group: byteOrNull(given?.message_group_id, 0xffff),
    id: byteOrNull(given?.message_id, 0xffff),
    listener,
  }
}

function matches(filtered: Filtered, event: BroadcastEvent): boolean {
  return (
    (filtered.tag === null ||
      event.componentTag === undefined ||
      filtered.tag === event.componentTag) &&
    (filtered.group === null || filtered.group === event.group) &&
    (filtered.id === null || filtered.id === event.id)
  )
}

function registerText(value: unknown): string {
  const text =
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
      ? String(value)
      : ''

  return text.slice(0, MOST_REGISTER)
}

function idOf(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null
  }

  return hexIdOf(value)
}

function registerIndexOf(property: string | symbol): number | null {
  if (typeof property !== 'string' || !/^\d{1,2}$/.test(property)) {
    return null
  }

  const index = Number(property)

  return index < SHARED_REGISTERS ? index : null
}

/** The receiver an application's documents are given: the functions of IPTVFJ STD-0013 table 5.1 under `navigator.receiverDevice`, `navigator.applicationManager`, `navigator.bmlCompat.browserPseudo` and `navigator.capabilities`, each allowed by the permission bitmap the boundary gives the document's URL. What it offers answers as a receiver does; what it does not, and what the bitmap forbids, answers that it failed and leaves a warning, and the application goes on. What the documents read at once — the shared registers, the broadcaster's memory, the programme — is carried in from the frame's name and carried on whenever it changes; the receiver's identifier comes from the player once the document opened, and an application that asks before then is answered when it does. */
export class HybridcastReceiver {
  private readonly environment: ReceiverEnvironment

  private readonly state: AppState

  private readonly memory: PersistentMemory

  private readonly bitmap: number

  private receiverId: ReceiverId | null | undefined = undefined

  private readonly waitingForTheId: (() => void)[] = []

  private keySet = KEY_SET_UNTIL_TOLD

  private readonly general: Filtered[] = []

  private readonly eventIdListeners: Listener[] = []

  private readonly nptListeners: Filtered[] = []

  private readonly alarms: Alarm[] = []

  private readonly npt = new Map<number, HeldNpt>()

  private readonly warned = new Set<string>()

  constructor(environment: ReceiverEnvironment) {
    this.environment = environment
    this.state = {
      ...environment.state,
      greg: [...environment.state.greg],
      memory: [...environment.state.memory],
    }
    this.bitmap =
      bitmapAt(
        environment.state.application.boundary,
        environment.documentAt,
      ) ?? 0
    this.memory = new PersistentMemory((name, value) =>
      this.remember(name, value),
    )
    this.memory.take(this.state.memory)
  }

  /** Whether the document's bitmap allows what a bit stands for. */
  allows(permission: Permission): boolean {
    return permits(this.bitmap, permission)
  }

  /** Whether a key the player hands over is one the application's key set takes. */
  takes(key: BmlKey): boolean {
    return keysOfKeySet(this.keySet).includes(key)
  }

  get name(): string {
    return this.state.name
  }

  set name(value: string) {
    this.state.name = String(value)
    this.environment.keep(this.state)
  }

  /** Takes what the player told the document. */
  take(message: ReceiverMessage): void {
    switch (message.kind) {
      case 'welcome':
        this.receiverId = message.receiverId
        message.npt.forEach((reading) => this.read(reading))
        this.waitingForTheId.splice(0).forEach((answer) => answer())
        return
      case 'event':
        this.fired(message.event)
        return
      case 'programme':
        this.programmeChanged(message.programme)
        return
      case 'npt':
        this.read(message.reading)
        return
      case 'key':
        return
    }
  }

  private warn(name: string, why: string): void {
    const said = `${name} ${why}`

    if (!this.warned.has(said)) {
      this.warned.add(said)
      this.environment.warn(`Hybridcast: ${said}`)
    }
  }

  /** Whether a function may run: it is allowed by the bitmap, or a warning names it. */
  private may(permission: Permission, name: string): boolean {
    if (this.allows(permission)) {
      return true
    }

    this.warn(name, 'is not permitted by the AIT')

    return false
  }

  private unoffered(name: string): false {
    this.warn(name, 'is not offered by this receiver')

    return false
  }

  private say(message: AppMessage): void {
    this.environment.say(message)
  }

  private remember(name: string, value: string | null): void {
    const others = this.state.memory.filter(([held]) => held !== name)

    this.state.memory = value === null ? others : [...others, [name, value]]
    this.environment.keep(this.state)
    this.say({ kind: 'memory', name, value })
  }

  private call(listener: Listener, value: unknown): void {
    try {
      listener(value)
    } catch (error) {
      this.environment.warn(`Hybridcast: a listener threw ${String(error)}`)
    }
  }

  private fired(event: BroadcastEvent): void {
    if (!this.allows('receiver')) {
      return
    }

    const told = {
      es_ref: { component_tag: event.componentTag ?? null },
      message_group_id: event.group,
      message_id: event.id,
      private_data_byte: privateDataOf(event.privateData),
    }

    this.general
      .filter((filtered) => matches(filtered, event))
      .forEach((filtered) => this.call(filtered.listener, told))
  }

  private programmeChanged(programme: EventInformation | null): void {
    const changed = !sameEventOnAir(this.state.programme, programme)

    this.state.programme = programme
    this.environment.keep(this.state)

    if (changed && this.allows('receiver')) {
      ;[...this.eventIdListeners].forEach((listener) => this.call(listener, {}))
    }
  }

  private nptOf(tag: number | null): { tag: number; ms: number } | null {
    const entry =
      tag === null
        ? [...this.npt.entries()].sort(([one], [other]) => one - other)[0]
        : [tag, this.npt.get(tag)]
    const held = entry?.[1] as HeldNpt | undefined

    return held
      ? {
          tag: entry?.[0] as number,
          ms: nptMilliseconds(
            held.reading,
            this.environment.now() - held.takenAt,
          ),
        }
      : null
  }

  private read(reading: NptReading): void {
    this.npt.set(reading.tag, { reading, takenAt: this.environment.now() })

    if (this.allows('receiver')) {
      this.nptListeners
        .filter(
          (filtered) => filtered.tag === null || filtered.tag === reading.tag,
        )
        .forEach((filtered) =>
          this.call(filtered.listener, {
            es_ref: { component_tag: reading.tag },
            npt: reading.milliseconds,
          }),
        )
    }

    this.alarms.forEach((alarm) => this.arm(alarm))
  }

  private arm(alarm: Alarm): void {
    const now = this.nptOf(alarm.tag)
    const held = now ? this.npt.get(now.tag) : undefined

    if (alarm.timer !== null) {
      this.environment.clearTimeout(alarm.timer)
      alarm.timer = null
    }

    if (!now || !held) {
      return
    }

    const wait = Math.max(0, (alarm.at - now.ms) / held.reading.rate)

    alarm.timer = this.environment.setTimeout(() => {
      this.alarms.splice(this.alarms.indexOf(alarm), 1)
      this.call(alarm.listener, {
        es_ref: { component_tag: now.tag },
        npt: alarm.at,
      })
    }, wait)
  }

  private deviceIdentifier(type: unknown): string | null {
    const id = this.receiverId

    return id && Number(type) === id.caSystemId ? id.cardId : null
  }

  private listen(
    list: Filtered[],
    filter: unknown,
    listener: unknown,
  ): boolean {
    if (typeof listener !== 'function' || list.length >= MOST_LISTENERS) {
      return false
    }

    list.push(filteredOf(filter, listener as Listener))

    return true
  }

  private unlisten(
    list: Filtered[],
    filter: unknown,
    listener: unknown,
  ): boolean {
    const tag = tagOf(filter)
    const at = list.findIndex(
      (filtered) => filtered.listener === listener && filtered.tag === tag,
    )

    if (at >= 0) {
      list.splice(at, 1)
    }

    return true
  }

  private streamEvent(): Record<string, unknown> {
    return {
      addGeneralEventMessageListener: (filter: unknown, listener: unknown) =>
        this.may('receiver', 'addGeneralEventMessageListener') &&
        this.listen(this.general, filter, listener),
      removeGeneralEventMessageListener: (filter: unknown, listener: unknown) =>
        this.may('receiver', 'removeGeneralEventMessageListener') &&
        this.unlisten(this.general, filter, listener),
      addEventIDUpdateListener: (listener: unknown) => {
        if (
          !this.may('receiver', 'addEventIDUpdateListener') ||
          typeof listener !== 'function' ||
          this.eventIdListeners.length >= MOST_LISTENERS
        ) {
          return false
        }

        this.eventIdListeners.push(listener as Listener)

        return true
      },
      removeEventIDUpdateListener: (listener: unknown) => {
        const at = this.eventIdListeners.indexOf(listener as Listener)

        if (at >= 0) {
          this.eventIdListeners.splice(at, 1)
        }

        return this.may('receiver', 'removeEventIDUpdateListener')
      },
      sourceIs: (name: unknown) =>
        this.may('receiver', 'sourceIs') && name === 'onair',
      addNPTReferenceMessageListener: (filter: unknown, listener: unknown) =>
        this.may('receiver', 'addNPTReferenceMessageListener') &&
        this.listen(this.nptListeners, filter, listener),
      removeNPTReferenceMessageListener: (filter: unknown, listener: unknown) =>
        this.may('receiver', 'removeNPTReferenceMessageListener') &&
        this.unlisten(this.nptListeners, filter, listener),
      setAlarmByNPT: (filter: unknown, npt: unknown, listener: unknown) => {
        if (
          !this.may('receiver', 'setAlarmByNPT') ||
          !Number.isSafeInteger(npt) ||
          typeof listener !== 'function' ||
          this.alarms.length >= MOST_LISTENERS
        ) {
          return false
        }

        const alarm: Alarm = {
          tag: tagOf(filter),
          at: npt as number,
          listener: listener as Listener,
          timer: null,
        }

        this.alarms.push(alarm)
        this.arm(alarm)

        return true
      },
      unsetAlarmByNPT: (filter: unknown, npt: unknown) => {
        const tag = tagOf(filter)

        this.alarms
          .filter(
            (alarm) =>
              alarm.tag === tag && (npt === undefined || alarm.at === npt),
          )
          .forEach((alarm) => {
            if (alarm.timer !== null) {
              this.environment.clearTimeout(alarm.timer)
            }

            this.alarms.splice(this.alarms.indexOf(alarm), 1)
          })

        return this.may('receiver', 'unsetAlarmByNPT')
      },
      getNPT: (filter: unknown) =>
        this.may('receiver', 'getNPT')
          ? (this.nptOf(tagOf(filter))?.ms ?? Number.NaN)
          : Number.NaN,
    }
  }

  private receiverDevice(): Record<string, unknown> {
    return {
      getCurrentEventInformation: (callback: unknown) => {
        if (!this.may('eventInformation', 'getCurrentEventInformation')) {
          return false
        }

        const programme = this.state.programme

        if (typeof callback === 'function') {
          this.call(
            callback as Listener,
            programme ? eventInformationAnswer(programme) : undefined,
          )
        }

        return true
      },
      isCommonEvent: () => {
        this.may('eventInformation', 'isCommonEvent')

        return false
      },
      getSystemInformation: () =>
        this.may('receiver', 'getSystemInformation')
          ? {
              makerid: MAKER_ID,
              modelname: BROWSER_NAME,
              browsername: BROWSER_NAME,
              browserversion: BROWSER_VERSION.join('.'),
            }
          : null,
      getDeviceIdentifier: (type: unknown, callback: unknown) => {
        if (
          !this.may('deviceIdentifier', 'getDeviceIdentifier') ||
          typeof callback !== 'function'
        ) {
          return false
        }

        const answer = () =>
          this.call(callback as Listener, this.deviceIdentifier(type))

        if (this.receiverId === undefined) {
          this.waitingForTheId.push(answer)
        } else {
          answer()
        }

        return true
      },
      tuneTo: () => this.unoffered('tuneTo'),
      setURLForCompanionDevice: () =>
        this.unoffered('setURLForCompanionDevice'),
      clearURLForCompanionDevice: () =>
        this.unoffered('clearURLForCompanionDevice'),
      getCompanionDeviceList: () => {
        this.unoffered('getCompanionDeviceList')

        return null
      },
      sendTextToCompanionDevice: () =>
        this.unoffered('sendTextToCompanionDevice'),
      addCompanionDeviceTextMessageListener: () =>
        this.unoffered('addCompanionDeviceTextMessageListener'),
      removeCompanionDeviceTextMessageListener: () =>
        this.unoffered('removeCompanionDeviceTextMessageListener'),
      streamEvent: this.streamEvent(),
    }
  }

  private keySetObject(): Record<string, unknown> {
    const keySet: Record<string, unknown> = {
      ...KEY_SET,
      setValue: (value: unknown) => {
        const mask = keySetOf(value)

        if (!this.may('receiver', 'keySet.setValue') || mask === null) {
          return false
        }

        this.keySet = mask
        this.say({ kind: 'keySet', mask })

        return true
      },
    }

    Object.defineProperty(keySet, 'value', {
      enumerable: true,
      get: () => this.keySet,
    })

    return keySet
  }

  private ownerApplication(): Record<string, unknown> {
    return {
      keySet: this.keySetObject(),
      destroyApplication: () => {
        this.say({ kind: 'destroy' })

        return true
      },
      replaceApplication: (orgId: unknown, appId: unknown, ait: unknown) => {
        const org = idOf(orgId)
        const app = idOf(appId)

        if (!this.may('receiver', 'replaceApplication')) {
          return false
        }

        if (org === null || org === 0 || app === null || !isAitUri(ait)) {
          this.warn('replaceApplication', 'needs the identifiers and the AIT')

          return false
        }

        this.say({ kind: 'replace', start: { ait, orgId: org, appId: app } })

        return true
      },
      exitFromManagedState: () => this.unoffered('exitFromManagedState'),
    }
  }

  private applicationManager(): Record<string, unknown> {
    const owner = this.ownerApplication()
    const { application } = this.state

    return {
      getOwnerApplication: () => owner,
      launchDataBroadcastingBrowser: (options: unknown) => {
        if (!this.may('receiver', 'launchDataBroadcastingBrowser')) {
          return false
        }

        this.say({
          kind: 'launchBml',
          componentTag: byteOrNull(recordOf(options)?.component_tag, 0xff),
        })

        return true
      },
      getOwnerAIT: () =>
        this.may('receiver', 'getOwnerAIT')
          ? {
              orgId: application.orgId,
              appId: application.appId,
              controlCode: application.controlCode,
              entryUrl: application.entryUrl,
              boundary: structuredClone(application.boundary),
            }
          : null,
      getApplicationBoundaryAndPermissionDescriptor: () =>
        this.may('receiver', 'getApplicationBoundaryAndPermissionDescriptor')
          ? structuredClone(application.boundary)
          : null,
      addPermissionManagedArea: () =>
        this.unoffered('addPermissionManagedArea'),
    }
  }

  /** The shared registers as an array the application reads and writes by index; every write is carried on and told to the player, so the documents have it when the application gives way to them. */
  private registers(): string[] {
    const greg = this.state.greg

    return new Proxy(greg, {
      get: (target, property, receiver) => {
        if (
          registerIndexOf(property) !== null &&
          !this.may('receiver', 'Greg')
        ) {
          return ''
        }

        return Reflect.get(target, property, receiver) as unknown
      },
      set: (target, property, value) => {
        const index = registerIndexOf(property)

        if (index === null || !this.may('receiver', 'Greg')) {
          return true
        }

        target[index] = registerText(value)
        this.environment.keep(this.state)
        this.say({ kind: 'greg', greg: [...target] })

        return true
      },
      defineProperty: () => true,
      deleteProperty: () => true,
    })
  }

  private browserPseudo(): Record<string, unknown> {
    return {
      Greg: this.registers(),
      readPersistentArray: (name: unknown, structure: unknown) =>
        this.may('persistentMemory', 'readPersistentArray')
          ? readArray(this.memory, name, structure)
          : null,
      writePersistentArray: (
        name: unknown,
        structure: unknown,
        data: unknown,
      ) =>
        this.may('persistentMemory', 'writePersistentArray') &&
        writeArray(this.memory, name, structure, data)
          ? DONE
          : FAILED,
    }
  }

  /** The objects the document's navigator is given. */
  api(): {
    receiverDevice: Record<string, unknown>
    applicationManager: Record<string, unknown>
    bmlCompat: { browserPseudo: Record<string, unknown> }
    capabilities: Record<string, unknown>
  } {
    return {
      receiverDevice: this.receiverDevice(),
      applicationManager: this.applicationManager(),
      bmlCompat: { browserPseudo: this.browserPseudo() },
      capabilities: { hasCapability: () => false },
    }
  }

  /** Tells the player where the broadcast's picture is, or that it fills the frame, and whether the application may draw over it. A document not allowed the picture has it nowhere. */
  videoAt(rect: Rect | null): void {
    this.say({
      kind: 'videoRect',
      rect: this.allows('broadcastVideo') ? rect : null,
      over: this.allows('overTheVideo'),
    })
  }
}
