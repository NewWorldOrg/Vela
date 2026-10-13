import assert from 'node:assert/strict'
import { test } from 'node:test'

import { SHARED_REGISTERS } from '@/lib/bml/messages'
import { EVERYTHING } from '@/lib/hybridcast/boundary'
import { KEY_SET } from '@/lib/hybridcast/keys'
import type { AppMessage, AppState } from '@/lib/hybridcast/messages'
import { HybridcastReceiver, UNOFFERED } from '@/lib/hybridcast/receiver'

const ENTRY = 'http://hc.example.test/p/index.html'

function stateWith(bitmap: number, over: Partial<AppState> = {}): AppState {
  return {
    application: {
      ait: 'http://hc.example.test/p/app.ait',
      orgId: 16,
      appId: 1,
      controlCode: 1,
      entryUrl: ENTRY,
      boundary: [
        { permissionBitmap: bitmap, managedUrls: ['http://example.test'] },
      ],
    },
    greg: Array.from({ length: SHARED_REGISTERS }, (_, at) =>
      at === 44 ? 'nhk:back' : '',
    ),
    memory: [],
    programme: {
      networkId: 32736,
      serviceId: 1024,
      now: {
        eventId: 0x1234,
        startsAt: Date.parse('2026-10-14T12:00:00Z'),
        duration: 1800,
        name: 'ニュース',
        description: '今日の出来事',
      },
      next: null,
    },
    name: '',
    ...over,
  }
}

function receiver(bitmap = EVERYTHING, over: Partial<AppState> = {}) {
  const said: AppMessage[] = []
  const kept: AppState[] = []
  const warned: string[] = []
  const timers: { run: () => void; ms: number }[] = []
  let now = 0
  const made = new HybridcastReceiver({
    documentAt: ENTRY,
    state: stateWith(bitmap, over),
    say: (message) => said.push(message),
    keep: (state) => kept.push(structuredClone(state)),
    warn: (text) => warned.push(text),
    now: () => now,
    setTimeout: (run, ms) => timers.push({ run, ms }) - 1,
    clearTimeout: () => {},
  })
  const api = made.api()
  const device = api.receiverDevice as Record<
    string,
    (...args: unknown[]) => unknown
  >
  const stream = device.streamEvent as unknown as Record<
    string,
    (...args: unknown[]) => unknown
  >
  const manager = api.applicationManager as Record<
    string,
    (...args: unknown[]) => unknown
  >
  const owner = manager.getOwnerApplication() as Record<
    string,
    (...args: unknown[]) => unknown
  >
  const pseudo = api.bmlCompat.browserPseudo as unknown as {
    Greg: string[]
    readPersistentArray: (...args: unknown[]) => unknown
    writePersistentArray: (...args: unknown[]) => unknown
  }
  const capabilities = api.capabilities as Record<
    string,
    (...args: unknown[]) => unknown
  >

  return {
    made,
    capabilities,
    device,
    stream,
    manager,
    owner,
    pseudo,
    said,
    kept,
    warned,
    timers,
    tick: (ms: number) => {
      now += ms
    },
  }
}

test('the receiver offers the functions of the table and answers for the nine it does not that they failed, warning once', () => {
  const { device, manager, owner, warned } = receiver()

  assert.equal(device.tuneTo({}, null), false)
  assert.equal(owner.exitFromManagedState('http://hc.example.test/'), false)
  assert.equal(manager.addPermissionManagedArea(), false)
  assert.equal(device.setURLForCompanionDevice('x', {}), false)
  assert.equal(device.clearURLForCompanionDevice(), false)
  assert.equal(device.getCompanionDeviceList(), null)
  assert.equal(device.sendTextToCompanionDevice('x'), false)
  assert.equal(
    device.addCompanionDeviceTextMessageListener(() => {}),
    false,
  )
  assert.equal(
    device.removeCompanionDeviceTextMessageListener(() => {}),
    false,
  )
  assert.equal(device.tuneTo({}, null), false)
  assert.equal(UNOFFERED.length, 9)
  assert.equal(warned.length, 9)
})

test('the twenty-five it offers are where the applications look for them', () => {
  const { capabilities, device, stream, manager, owner, pseudo } = receiver()
  const offered = [
    device.getCurrentEventInformation,
    device.isCommonEvent,
    device.getSystemInformation,
    device.getDeviceIdentifier,
    stream.addGeneralEventMessageListener,
    stream.removeGeneralEventMessageListener,
    stream.addEventIDUpdateListener,
    stream.removeEventIDUpdateListener,
    stream.sourceIs,
    stream.addNPTReferenceMessageListener,
    stream.removeNPTReferenceMessageListener,
    stream.setAlarmByNPT,
    stream.unsetAlarmByNPT,
    stream.getNPT,
    manager.getOwnerApplication,
    (owner.keySet as unknown as Record<string, unknown>).setValue,
    owner.destroyApplication,
    owner.replaceApplication,
    manager.launchDataBroadcastingBrowser,
    manager.getOwnerAIT,
    manager.getApplicationBoundaryAndPermissionDescriptor,
    capabilities.hasCapability,
    pseudo.readPersistentArray,
    pseudo.writePersistentArray,
  ]

  assert.equal(offered.length + 1, 25)
  assert.ok(offered.every((one) => typeof one === 'function'))
  assert.equal(pseudo.Greg.length, SHARED_REGISTERS)
})

test('the programme on air reaches the callback within the call, with the fields an application reads', () => {
  const { device } = receiver()
  let told: Record<string, unknown> | undefined

  assert.equal(
    device.getCurrentEventInformation((info: Record<string, unknown>) => {
      told = info
    }),
    true,
  )
  assert.equal(told?.service_id, 1024)
  assert.equal(told?.event_id, 0x1234)
  assert.equal(told?.duration, 1800)
  assert.equal(told?.name, 'ニュース')
  assert.ok(told?.start_time instanceof Date)
  assert.equal(device.isCommonEvent(told), false)
})

test('the system is named without a maker, with four fields', () => {
  const { device } = receiver()

  assert.deepEqual(device.getSystemInformation(null), {
    makerid: '',
    modelname: 'Vela',
    browsername: 'Vela',
    browserversion: '1.0.0',
  })
})

test('the identifier reaches the callback within the call once the player has told it, for the CA system of the card only', () => {
  const { made, device } = receiver()
  const told: unknown[] = []

  made.take({
    kind: 'welcome',
    receiverId: { caSystemId: 5, cardId: '0123456789AB' },
    npt: [],
  })
  device.getDeviceIdentifier(0x0005, (id: unknown) => told.push(id))
  device.getDeviceIdentifier(0x000d, (id: unknown) => told.push(id))

  assert.deepEqual(told, ['0123456789AB', null])
})

test('an identifier asked for before the player told it is answered when it does, and none when there is none', () => {
  const { made, device } = receiver()
  const told: unknown[] = []

  device.getDeviceIdentifier(5, (id: unknown) => told.push(id))
  assert.deepEqual(told, [])
  made.take({ kind: 'welcome', receiverId: null, npt: [] })
  assert.deepEqual(told, [null])
})

test('the source is on air', () => {
  const { stream } = receiver()

  assert.equal(stream.sourceIs('onair'), true)
  assert.equal(stream.sourceIs('recorded'), false)
})

test('a bitmap of 0x0000 forbids everything but the owner application, closing it and the capabilities', () => {
  const { capabilities, device, stream, manager, owner, pseudo, said, warned } =
    receiver(0x0000)
  let called = false

  assert.equal(
    device.getCurrentEventInformation(() => (called = true)),
    false,
  )
  assert.equal(called, false)
  assert.equal(device.getSystemInformation(null), null)
  assert.equal(
    device.getDeviceIdentifier(5, () => {}),
    false,
  )
  assert.equal(stream.sourceIs('onair'), false)
  assert.equal(manager.launchDataBroadcastingBrowser({}), false)
  assert.equal(pseudo.Greg[44], '')
  assert.equal(pseudo.readPersistentArray('a', 'S:1B'), null)
  assert.ok(Number.isNaN(pseudo.writePersistentArray('a', 'S:1B', ['x'])))
  assert.equal(capabilities.hasCapability('x'), false)
  assert.ok(manager.getOwnerApplication())
  assert.equal(owner.destroyApplication(), true)
  assert.deepEqual(said, [{ kind: 'destroy' }])
  assert.ok(warned.some((text) => text.includes('getSystemInformation')))
})

test('a bitmap with 001 above allows bit by bit', () => {
  const eventsOnly = receiver(0x2000 | (1 << 10))

  assert.equal(
    eventsOnly.device.getCurrentEventInformation(() => {}),
    true,
  )
  assert.equal(eventsOnly.device.getSystemInformation(null), null)
  assert.equal(
    eventsOnly.device.getDeviceIdentifier(5, () => {}),
    false,
  )

  const idOnly = receiver(0x2000 | (1 << 7))

  assert.equal(
    idOnly.device.getDeviceIdentifier(5, () => {}),
    true,
  )
  assert.equal(
    idOnly.device.getCurrentEventInformation(() => {}),
    false,
  )

  const memoryOnly = receiver(0x2000 | (1 << 9))

  assert.equal(memoryOnly.pseudo.writePersistentArray('a', 'S:3B', ['abc']), 1)
  assert.deepEqual(memoryOnly.pseudo.readPersistentArray('a', 'S:3B'), ['abc'])
  assert.equal(memoryOnly.pseudo.Greg[44], '')
})

test('the shared registers read what the documents left and carry on what the application writes', () => {
  const { pseudo, said, kept } = receiver()

  assert.equal(pseudo.Greg[44], 'nhk:back')
  pseudo.Greg[55] = 'nhk:next'
  pseudo.Greg[61] = 1 as unknown as string

  assert.equal(pseudo.Greg[55], 'nhk:next')
  assert.equal(pseudo.Greg[61], '1')
  assert.equal(kept.at(-1)?.greg[55], 'nhk:next')
  assert.deepEqual(
    said.map((message) => message.kind),
    ['greg', 'greg'],
  )
  assert.equal((said.at(-1) as { greg: string[] }).greg[61], '1')
  pseudo.Greg[64] = 'beyond'
  assert.equal(pseudo.Greg.length, SHARED_REGISTERS)
})

test('the memory is the broadcaster’s as the documents keep it, carried on and told to the player when written', () => {
  const { pseudo, said, kept } = receiver(EVERYTHING, {
    memory: [],
  })

  assert.equal(
    pseudo.writePersistentArray('nvram://~/local/a', 'S:3B', ['abc']),
    1,
  )
  assert.deepEqual(pseudo.readPersistentArray('nvram://~/local/a', 'S:3B'), [
    'abc',
  ])
  assert.equal(said.at(-1)?.kind, 'memory')
  assert.equal(kept.at(-1)?.memory[0]?.[0], 'nvram://~/local/a')

  const next = receiver(EVERYTHING, { memory: kept.at(-1)?.memory ?? [] })

  assert.deepEqual(
    next.pseudo.readPersistentArray('nvram://~/local/a', 'S:3B'),
    ['abc'],
  )
})

test('the key set says which keys the application takes, and d only once it asks for it', () => {
  const { made, owner, said } = receiver()
  const keySet = owner.keySet as unknown as {
    setValue: (mask: unknown) => boolean
    value: number
    RED: number
    DBUTTON: number
  }

  assert.equal(made.takes('red'), true)
  assert.equal(made.takes('d'), false)
  assert.equal(keySet.setValue(keySet.RED | keySet.DBUTTON), true)
  assert.equal(keySet.value, KEY_SET.RED | KEY_SET.DBUTTON)
  assert.equal(made.takes('d'), true)
  assert.equal(made.takes('up'), false)
  assert.deepEqual(said, [
    { kind: 'keySet', mask: KEY_SET.RED | KEY_SET.DBUTTON },
  ])
})

test('the application leaves for the documents, of the component it names or the one it came from, or for another application of an AIT', () => {
  const { manager, owner, said } = receiver()

  manager.launchDataBroadcastingBrowser({ component_tag: 64 })
  manager.launchDataBroadcastingBrowser({})
  owner.replaceApplication('12', '1', 'http://hc.example.test/b.ait')
  owner.replaceApplication(18, 2, 'http://hc.example.test/b.ait')

  assert.equal(owner.replaceApplication('12', '1'), false)
  assert.deepEqual(said, [
    { kind: 'launchBml', componentTag: 64 },
    { kind: 'launchBml', componentTag: null },
    {
      kind: 'replace',
      start: { ait: 'http://hc.example.test/b.ait', orgId: 18, appId: 1 },
    },
    {
      kind: 'replace',
      start: { ait: 'http://hc.example.test/b.ait', orgId: 18, appId: 2 },
    },
  ])
})

test('the AIT the application came from is told as it was read', () => {
  const { manager } = receiver()

  assert.deepEqual(manager.getOwnerAIT(), {
    orgId: 16,
    appId: 1,
    controlCode: 1,
    entryUrl: ENTRY,
    boundary: [
      { permissionBitmap: EVERYTHING, managedUrls: ['http://example.test'] },
    ],
  })
  assert.deepEqual(manager.getApplicationBoundaryAndPermissionDescriptor(), [
    { permissionBitmap: EVERYTHING, managedUrls: ['http://example.test'] },
  ])
})

test('event messages reach the listeners whose filter they match, with the private data as text', () => {
  const { made, stream } = receiver()
  const heard: Record<string, unknown>[] = []
  const listener = (event: Record<string, unknown>) => heard.push(event)

  stream.addGeneralEventMessageListener(
    { es_ref: { component_tag: 96 }, message_group_id: 1, message_id: 145 },
    listener,
  )

  const event = (id: number, componentTag = 96) => ({
    group: 1,
    id,
    type: 0,
    immediate: true,
    at: 0,
    privateData: new TextEncoder().encode('KINKYU'),
    componentTag,
  })

  made.take({ kind: 'event', event: event(145) })
  made.take({ kind: 'event', event: event(146) })
  made.take({ kind: 'event', event: event(145, 97) })

  assert.equal(heard.length, 1)
  assert.deepEqual(heard[0], {
    es_ref: { component_tag: 96 },
    message_group_id: 1,
    message_id: 145,
    private_data_byte: 'KINKYU',
  })

  stream.removeGeneralEventMessageListener(
    { es_ref: { component_tag: 96 } },
    listener,
  )
  made.take({ kind: 'event', event: event(145) })
  assert.equal(heard.length, 1)
})

test('a change of programme is told to the event ID listeners, and the guide answering the same one again is not', () => {
  const { made, stream, kept } = receiver()
  let told = 0

  stream.addEventIDUpdateListener(() => {
    told += 1
  })

  const programme = stateWith(EVERYTHING).programme

  made.take({ kind: 'programme', programme })
  assert.equal(told, 0)
  made.take({
    kind: 'programme',
    programme: programme && {
      ...programme,
      now: programme.now && { ...programme.now, eventId: 0x1235 },
    },
  })
  assert.equal(told, 1)
  assert.equal(kept.at(-1)?.programme?.now?.eventId, 0x1235)
})

test('the NPT reads as the documents read it, tells its listeners and rings the alarms set by it', () => {
  const { made, stream, timers, tick } = receiver()
  const references: unknown[] = []
  const rung: unknown[] = []

  assert.ok(Number.isNaN(stream.getNPT()))
  stream.addNPTReferenceMessageListener(
    { es_ref: { component_tag: 0x40 } },
    (told: unknown) => references.push(told),
  )
  stream.setAlarmByNPT(
    { es_ref: { component_tag: 0x40 } },
    5000,
    (told: unknown) => rung.push(told),
  )
  made.take({
    kind: 'npt',
    reading: { tag: 0x40, milliseconds: 2000, rate: 1 },
  })
  tick(500)

  assert.equal(stream.getNPT({ es_ref: { component_tag: 0x40 } }), 2500)
  assert.deepEqual(references, [{ es_ref: { component_tag: 0x40 }, npt: 2000 }])
  assert.equal(timers.at(-1)?.ms, 3000)
  timers.at(-1)?.run()
  assert.deepEqual(rung, [{ es_ref: { component_tag: 0x40 }, npt: 5000 }])
})

test('the picture is where the object is only where the bitmap allows it, and drawing over it with bit 11', () => {
  const all = receiver()
  const rect = { left: 960, top: 0, width: 960, height: 540 }

  all.made.videoAt(rect)
  assert.deepEqual(all.said, [{ kind: 'videoRect', rect, over: true }])

  const pictureOnly = receiver(0x2000 | (1 << 12))

  pictureOnly.made.videoAt(rect)
  assert.deepEqual(pictureOnly.said, [{ kind: 'videoRect', rect, over: false }])

  const none = receiver(0x2000 | (1 << 5))

  none.made.videoAt(rect)
  assert.deepEqual(none.said, [{ kind: 'videoRect', rect: null, over: false }])
})
