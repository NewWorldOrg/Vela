import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

const ORIGIN = 'https://vela.example.test'

const SOURCE = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8')

interface Shown {
  title: string
  options: { body?: string; icon?: string; tag?: string; data?: unknown }
}

interface FakeWindow {
  url: string
  focused: boolean
  went?: string
  focus: () => Promise<FakeWindow>
  navigate: (url: string) => Promise<FakeWindow | null>
}

interface Worker {
  shown: Shown[]
  opened: string[]
  windows: FakeWindow[]
  closed: number
  dispatch: (type: string, event: object) => Promise<void>
  pathToOpen: (path: unknown) => string
}

function windowAt(url: string, controlled = true): FakeWindow {
  const open: FakeWindow = {
    url,
    focused: false,
    focus: async () => {
      open.focused = true

      return open
    },
    navigate: async (to) => {
      if (!controlled) {
        return null
      }

      open.went = to

      return open
    },
  }

  return open
}

function worker(windows: FakeWindow[] = []): Worker {
  const listeners = new Map<string, (event: object) => void>()
  const made: Worker = {
    shown: [],
    opened: [],
    windows,
    closed: 0,
    dispatch: async (type, event) => {
      const waited: Promise<unknown>[] = []

      listeners.get(type)?.({
        ...event,
        waitUntil: (promise: Promise<unknown>) => waited.push(promise),
      })

      await Promise.all(waited)
    },
    pathToOpen: () => '',
  }
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, listener: (event: object) => void) =>
      listeners.set(type, listener),
    registration: {
      showNotification: async (title: string, options: Shown['options']) => {
        made.shown.push(JSON.parse(JSON.stringify({ title, options })))
      },
    },
    clients: {
      matchAll: async () => made.windows,
      openWindow: async (url: string) => {
        made.opened.push(url)

        return null
      },
      claim: async () => undefined,
    },
    skipWaiting: async () => undefined,
  }
  const context: Record<string, unknown> = { self, URL, console }

  runInNewContext(SOURCE, context)

  const pathToOpen = context.pathToOpen as (
    path: unknown,
    origin: string,
  ) => string

  made.pathToOpen = (path) => pathToOpen(path, ORIGIN)

  return made
}

function pushOf(said: unknown) {
  return {
    data: {
      json: () => {
        if (typeof said === 'string') {
          return JSON.parse(said)
        }

        return said
      },
    },
  }
}

function pressOn(data: unknown) {
  const made = { closed: false }

  return {
    made,
    event: {
      notification: {
        data,
        close: () => {
          made.closed = true
        },
      },
    },
  }
}

test('a path inside Vela is opened as it is, with its query and its fragment', () => {
  const at = worker()

  assert.equal(at.pathToOpen('/recordings/0a1b'), '/recordings/0a1b')
  assert.equal(
    at.pathToOpen('/guide?date=2026-11-13#now'),
    '/guide?date=2026-11-13#now',
  )
  assert.equal(at.pathToOpen('/'), '/')
})

test('anything but a path starting with one slash opens the top page', () => {
  const at = worker()

  for (const path of [
    'https://elsewhere.example.test/',
    '//elsewhere.example.test/',
    '/\\elsewhere.example.test/',
    '\\\\elsewhere.example.test',
    'javascript:alert(1)',
    'recordings/0a1b',
    '',
    null,
    undefined,
    42,
    { path: '/guide' },
  ]) {
    assert.equal(at.pathToOpen(path), '/', String(path))
  }
})

test('a push is shown with its title, its body and the app icon, tagged by its id', async () => {
  const at = worker()

  await at.dispatch(
    'push',
    pushOf({
      title: '録画の失敗',
      body: '見本の番組',
      path: '/recordings/0a1b',
      id: 'ev-1',
    }),
  )

  assert.deepEqual(at.shown, [
    {
      title: '録画の失敗',
      options: {
        body: '見本の番組',
        icon: '/pwa/icon-192.png',
        tag: 'ev-1',
        data: { path: '/recordings/0a1b' },
      },
    },
  ])
})

test('a test send has no id and no tag, so each one is shown', async () => {
  const at = worker()

  await at.dispatch(
    'push',
    pushOf({ title: 'テスト', body: '見本', path: '/', id: null }),
  )

  assert.equal(at.shown[0].options.tag, undefined)
  assert.equal('tag' in at.shown[0].options, false)
})

test('a push whose path leads away keeps the top page to open', async () => {
  const at = worker()

  await at.dispatch(
    'push',
    pushOf({
      title: '見本',
      body: '',
      path: 'https://elsewhere.example.test/',
    }),
  )

  assert.deepEqual(at.shown[0].options.data, { path: '/' })
})

test('a push that cannot be read is still shown, under the app name', async () => {
  for (const event of [
    pushOf('{not json'),
    { data: null },
    pushOf(['a list']),
    pushOf({ title: 42 }),
  ]) {
    const at = worker()

    await at.dispatch('push', event)

    assert.equal(at.shown.length, 1)
    assert.equal(at.shown[0].title, 'Vela')
    assert.equal(at.shown[0].options.icon, '/pwa/icon-192.png')
  }
})

test('a press closes the notice and brings an open Vela to its path', async () => {
  const open = windowAt(`${ORIGIN}/guide`)
  const at = worker([windowAt('https://elsewhere.example.test/'), open])
  const { made, event } = pressOn({ path: '/recordings/0a1b' })

  await at.dispatch('notificationclick', event)

  assert.equal(made.closed, true)
  assert.equal(open.focused, true)
  assert.equal(open.went, `${ORIGIN}/recordings/0a1b`)
  assert.deepEqual(at.opened, [])
})

test('a press opens a new Vela where none is open', async () => {
  const at = worker([windowAt('https://elsewhere.example.test/')])
  const { event } = pressOn({ path: '/recordings/0a1b' })

  await at.dispatch('notificationclick', event)

  assert.deepEqual(at.opened, [`${ORIGIN}/recordings/0a1b`])
})

test('a press opens a new Vela where the open one cannot be led', async () => {
  const at = worker([windowAt(`${ORIGIN}/guide`, false)])
  const { event } = pressOn({ path: '/library' })

  await at.dispatch('notificationclick', event)

  assert.deepEqual(at.opened, [`${ORIGIN}/library`])
})

test('a press on a notice whose path was changed on the way opens the top page', async () => {
  const at = worker()
  const { event } = pressOn({ path: '//elsewhere.example.test/' })

  await at.dispatch('notificationclick', event)

  assert.deepEqual(at.opened, [`${ORIGIN}/`])
})

test('the worker only shows notices and takes presses: it neither fetches nor keeps anything', () => {
  assert.doesNotMatch(SOURCE, /addEventListener\(\s*['"]fetch['"]/)
  assert.doesNotMatch(SOURCE, /\bcaches\b|importScripts|\bfetch\(/)
})
