import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

const THE_SHEET = 'app/globals.css'

const THE_DELAYS = 'lib/arrival.ts'

const THE_WAITING_SHAPE = 'components/ui/skeleton.tsx'

const THE_PLAYER_OVERLAY = 'components/recordings/player-seek-flash.tsx'

const READ = ['app', 'components']

const NOT_SOURCE = new Set([
  '.git',
  '.next',
  'node_modules',
  'storybook-static',
])

const THE_VOCABULARY = [
  'breathe',
  'curtain-corner',
  'curtain-panel',
  'draw',
  'ink',
  'item',
  'rise',
  'waiting-line',
]

const THE_LOOPS = ['--animate-breathe', '--animate-waiting-line']

const THE_UTILITIES = [
  'curtain-panel',
  'drawn',
  'rises',
  'arrives',
  'breathes',
  'waits',
]

const CARRIED_BY_A_VARIABLE = 'calc(var(--d, 0s) + var(--delay, 0s)'

const A_KEYFRAMES = /@keyframes\s+([\w-]+)\s*\{/g

const AN_ARRIVAL_ANIMATION =
  /--animate-(curtain-panel|curtain-corner|draw|ink|rise|item|breathe|waiting-line):([\s\S]*?);/g

const A_UTILITY = /@utility\s+([\w-]+)\s*\{([\s\S]*?)\n\}/g

const WRITES_ITS_OWN_DELAY = /animationDelay|animation-delay\s*:/

const WRITES_ITS_OWN_ANIMATION = /animation\s*:|animate-\[/

const THE_OLD_BLINK = /animate-pulse/

async function sourceFiles(dir: string): Promise<string[]> {
  const found: string[] = []

  for (const entry of await readdir(path.join(ROOT, dir), {
    withFileTypes: true,
  })) {
    const relative = path.posix.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (!NOT_SOURCE.has(entry.name)) {
        found.push(...(await sourceFiles(relative)))
      }
      continue
    }

    if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      found.push(relative)
    }
  }

  return found
}

async function everySource(): Promise<{ file: string; source: string }[]> {
  const read: { file: string; source: string }[] = []

  for (const dir of READ) {
    for (const file of await sourceFiles(dir)) {
      read.push({ file, source: await readFile(path.join(ROOT, file), 'utf8') })
    }
  }

  return read
}

async function theSheet(): Promise<string> {
  return await readFile(path.join(ROOT, THE_SHEET), 'utf8')
}

test('the screens arrive in one closed vocabulary of movements', async () => {
  const sheet = await theSheet()
  const named = [...sheet.matchAll(A_KEYFRAMES)].map((one) => one[1])
  const arrival = named.filter((one) => THE_VOCABULARY.includes(one))

  assert.deepEqual(
    [...arrival].sort(),
    [...THE_VOCABULARY].sort(),
    'the movements the canon names are not the ones this sheet declares',
  )

  for (const one of THE_VOCABULARY) {
    assert.equal(
      named.filter((said) => said === one).length,
      1,
      `${one} is declared more than once, so two screens can move differently ` +
        'while saying the same word',
    )
  }
})

test('nothing in the vocabulary loops but the breathing and the waiting', async () => {
  const sheet = await theSheet()
  const looping: string[] = []

  for (const declared of sheet.matchAll(AN_ARRIVAL_ANIMATION)) {
    if (declared[2].includes('infinite')) {
      looping.push(`--animate-${declared[1]}`)
    }
  }

  assert.deepEqual(
    looping.sort(),
    [...THE_LOOPS].sort(),
    'a movement that never stops was added outside the breathing and the ' +
      'waiting line',
  )
})

test('every delay is handed down through the variables, not written on a part', async () => {
  const sheet = await theSheet()

  const declared = new Map<string, string>()

  for (const utility of sheet.matchAll(A_UTILITY)) {
    declared.set(utility[1], utility[2])
  }

  for (const name of ['rises', 'arrives', 'drawn']) {
    const body = declared.get(name)

    assert.ok(body !== undefined, `the ${name} movement has no utility`)
    assert.ok(
      body.includes(CARRIED_BY_A_VARIABLE),
      `${name} does not take its delay from the variables on the part that ` +
        'moves, so either a part carries a number of its own or every part ' +
        'moves at once',
    )
  }

  for (const name of ['rise', 'item', 'draw', 'ink']) {
    const token = sheet.match(new RegExp(`--animate-${name}:([^;]*);`, 'u'))

    assert.ok(token, `--animate-${name} is not declared`)
    assert.doesNotMatch(
      token[1],
      /var\(--delay|var\(--d[,)]/,
      `--animate-${name} builds the delay into a value declared on :root, ` +
        'where every part reads the same fallback and the procession ' +
        'collapses to one moment',
    )
  }

  for (const { file, source } of await everySource()) {
    if (file === THE_PLAYER_OVERLAY) {
      continue
    }

    assert.doesNotMatch(
      source,
      WRITES_ITS_OWN_DELAY,
      `${file} writes an animation delay of its own instead of handing one ` +
        `down through the custom properties ${THE_DELAYS} sets`,
    )
  }
})

test('no screen declares a movement of its own', async () => {
  for (const { file, source } of await everySource()) {
    assert.doesNotMatch(
      source,
      WRITES_ITS_OWN_ANIMATION,
      `${file} declares an animation of its own; the movements live in ` +
        `${THE_SHEET} and a screen only names one`,
    )
  }
})

test('every movement is switched off where less of it is asked for', async () => {
  const sheet = await theSheet()
  const declared = new Map<string, string>()

  for (const utility of sheet.matchAll(A_UTILITY)) {
    declared.set(utility[1], utility[2])
  }

  for (const name of THE_UTILITIES) {
    const body = declared.get(name)

    assert.ok(body !== undefined, `the ${name} movement has no utility`)
    assert.match(
      body,
      /@media \(prefers-reduced-motion: reduce\)/,
      `${name} keeps moving for a reader who asked for less movement`,
    )
  }
})

test('the shape a list waits in no longer blinks', async () => {
  const waiting = await readFile(path.join(ROOT, THE_WAITING_SHAPE), 'utf8')

  assert.doesNotMatch(
    waiting,
    THE_OLD_BLINK,
    'the skeleton still blinks instead of running one line of light across it',
  )
  assert.match(waiting, /\bwaits\b/)

  for (const { file, source } of await everySource()) {
    assert.doesNotMatch(
      source,
      THE_OLD_BLINK,
      `${file} still blinks a shape that is waiting`,
    )
  }
})
