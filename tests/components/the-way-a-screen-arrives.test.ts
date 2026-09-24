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

const THE_ARRIVAL_HOOK = 'hooks/useArrived.ts'

const THE_LONG_LISTS = [
  'components/library/recording-row.tsx',
  'components/reservations/reservation-row.tsx',
  'components/reservations/outcome-row.tsx',
  'components/live/channel-grid.tsx',
  'components/guide/guide-grid.tsx',
]

const READ = ['app', 'components']

const NOT_SOURCE = new Set([
  '.git',
  '.next',
  'node_modules',
  'storybook-static',
])

const THE_VOCABULARY = [
  'breathe',
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
  'screen-rises',
  'arrives',
  'joins',
  'breathes',
  'waits',
  'appears',
  'scrim-appears',
  'scrim-disappears',
]

const THE_MOVEMENTS_THAT_STOP = [
  'curtain-panel',
  'draw',
  'ink',
  'rise',
  'screen-rise',
  'item',
  'joining',
  'breathe',
  'waiting-line',
  'scrim-in',
  'scrim-out',
  'surface-in',
]

const CARRIED_BY_A_VARIABLE = 'calc(var(--d, 0s) + var(--delay, 0s)'

const A_KEYFRAMES = /@keyframes\s+([\w-]+)\s*\{/g

const AN_ARRIVAL_ANIMATION =
  /--animate-(curtain-panel|draw|ink|rise|item|breathe|waiting-line):([\s\S]*?);/g

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
    assert.ok(
      declared.get(name) !== undefined,
      `the ${name} movement has no utility`,
    )
  }

  const asked = sheet.match(
    /@media \(prefers-reduced-motion: reduce\) \{\s*:root:not\(\[data-motion='moves'\]\) \{([\s\S]*?)\n    \}/,
  )
  const switched = sheet.match(
    /:root\[data-motion='still'\] \{([\s\S]*?)\n  \}/,
  )

  assert.ok(asked, 'the machine asking for less movement stops nothing')
  assert.ok(switched, 'the switch in the settings stops nothing')

  for (const token of THE_MOVEMENTS_THAT_STOP) {
    for (const [what, block] of [
      ['the machine asks for less movement', asked[1]],
      ['the reader switched movement off', switched[1]],
    ] as const) {
      assert.ok(
        block.includes(`--animate-${token}: none;`),
        `${token} keeps running when ${what}`,
      )
    }
  }

  assert.match(
    declared.get('curtain-panel') ?? '',
    /:root\[data-motion='still'\] & \{\s*display: none;/,
    'the curtain is still drawn when movement is switched off, so the screen ' +
      'opens behind a panel that never leaves',
  )
  assert.match(
    declared.get('waits') ?? '',
    /:root\[data-motion='still'\] &::after \{\s*display: none;/,
    'the line of light still crosses the shape that is waiting',
  )
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

const COMPOSITED = new Set(['transform', 'opacity'])

const DRAWN_BY_HAND = 'stroke-dasharray'

const THE_LINE_DRAWING = 'draw'

const A_DECLARATION = /(^|[;{])\s*([-a-z]+)\s*:/g

function keyframeBodies(sheet: string): Map<string, string> {
  const found = new Map<string, string>()

  for (const opened of sheet.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
    const from = opened.index + opened[0].length
    let depth = 1
    let at = from

    while (at < sheet.length && depth > 0) {
      if (sheet[at] === '{') {
        depth += 1
      } else if (sheet[at] === '}') {
        depth -= 1
      }
      at += 1
    }

    found.set(opened[1], sheet.slice(from, at - 1))
  }

  return found
}

function propertiesIn(body: string): string[] {
  return [...body.matchAll(A_DECLARATION)].map((one) => one[2])
}

test('every movement animates only what the compositor can carry', async () => {
  const sheet = await theSheet()
  const bodies = keyframeBodies(sheet)

  assert.ok(bodies.size > 0, 'no movement is declared in the sheet at all')

  for (const [name, body] of bodies) {
    for (const property of propertiesIn(body)) {
      if (property === DRAWN_BY_HAND) {
        assert.equal(
          name,
          THE_LINE_DRAWING,
          `${name} animates ${DRAWN_BY_HAND}, which only the line drawing is ` +
            'allowed to do, and only on a heading mark',
        )
        continue
      }

      assert.ok(
        COMPOSITED.has(property),
        `${name} animates ${property}, which is redrawn on the main thread ` +
          'every frame; a movement is built from transform and opacity or it ' +
          'stutters as soon as a table of rows is moving',
      )
    }
  }
})

test('nothing anywhere animates a shape that has to be redrawn', async () => {
  const sheet = await theSheet()

  for (const property of ['clip-path', 'width', 'height', 'border-radius']) {
    for (const [name, body] of keyframeBodies(sheet)) {
      assert.ok(
        !propertiesIn(body).includes(property),
        `${name} animates ${property}`,
      )
    }
  }

  for (const { file, source } of await everySource()) {
    assert.doesNotMatch(
      source,
      /clip-path|clipPath:/,
      `${file} moves a clip path, which was the stutter this vocabulary was ` +
        'rewritten to be rid of',
    )
  }
})

test('an entrance is switched off once it is over, and under a hand', async () => {
  const sheet = await theSheet()
  const declared = new Map<string, string>()

  for (const utility of sheet.matchAll(A_UTILITY)) {
    declared.set(utility[1], utility[2])
  }

  for (const name of ['rises', 'arrives']) {
    const body = declared.get(name)

    assert.ok(body !== undefined, `the ${name} movement has no utility`)
    assert.match(
      body,
      /\[data-arrived\] & \{\s*animation: none;/,
      `${name} keeps a finished animation on every part that carried it, so ` +
        'each one holds a layer of its own for the life of the page',
    )
  }

  const hook = await readFile(path.join(ROOT, THE_ARRIVAL_HOOK), 'utf8')

  for (const input of ['wheel', 'touchstart', 'keydown', 'pointerdown']) {
    assert.match(
      hook,
      new RegExp(`'${input}'`),
      `a ${input} does not stop the arrival`,
    )
  }
  assert.doesNotMatch(
    hook,
    /'scroll'/,
    'a scroll the screen makes by itself would stop the arrival before it is seen',
  )
  assert.match(hook, /data-arrived/)
})

test('only the head of a long list is held back; the rest does not move', async () => {
  const delays = await readFile(path.join(ROOT, THE_DELAYS), 'utf8')

  assert.match(delays, /LAST_ONE_THAT_MOVES = 12\b/)

  for (const file of THE_LONG_LISTS) {
    const source = await readFile(path.join(ROOT, file), 'utf8')

    assert.match(
      source,
      /(arrivesIn|risesIn)\(nth\)/,
      `${file} names a movement on every part it draws, so a list of two ` +
        'hundred moves two hundred parts at once',
    )
    assert.doesNotMatch(
      source,
      /'(arrives|rises) /,
      `${file} still writes the movement into a class list where the cap on ` +
        'how many parts move cannot reach it',
    )
  }
})

const THE_FACES = [
  'components/ui/dialog.tsx',
  'components/ui/alert-dialog.tsx',
  'components/ui/dropdown-menu.tsx',
  'components/ui/popover.tsx',
  'components/ui/select.tsx',
  'components/ui/sheet.tsx',
]

const A_MOVEMENT_NOTHING_DECLARES =
  /animate-in|animate-out|fade-in-\d|fade-out-\d|zoom-in-\d|zoom-out-\d|slide-in-from-\w+|slide-out-to-\w+/

test('a face comes and goes by a movement this sheet declares', async () => {
  const sheet = await theSheet()

  for (const name of ['appear', 'disappear']) {
    assert.ok(
      keyframeBodies(sheet).has(name),
      `${name} is not declared, so the faces that name it do not move`,
    )
  }

  for (const file of THE_FACES) {
    const source = await readFile(path.join(ROOT, file), 'utf8')

    assert.doesNotMatch(
      source,
      A_MOVEMENT_NOTHING_DECLARES,
      `${file} wears a class from a library this build does not have, so it ` +
        'appears and disappears with no movement at all while reading as ' +
        'though it had one',
    )
    assert.match(
      source,
      /data-\[state=open\]:(appears|scrim-appears)/,
      `${file} names nothing for the way it opens`,
    )
    assert.doesNotMatch(source, /data-\[state=closed\]:appears/)

    if (/data-slot="(dialog|alert-dialog|sheet)-overlay"/.test(source)) {
      assert.match(
        source,
        /data-\[state=closed\]:scrim-disappears/,
        `${file} draws a scrim that does not fade out`,
      )
    }
  }
})

test('a face that is centred by a translate does not move its position', async () => {
  for (const file of THE_FACES) {
    const source = await readFile(path.join(ROOT, file), 'utf8')

    if (!/translate-x-\[-50%\]/.test(source)) {
      continue
    }

    assert.doesNotMatch(
      source,
      /\[--from-x:|\[--from-y:/,
      `${file} is centred with a translate and asks to arrive from a ` +
        'distance, which takes it off centre for as long as it is moving',
    )
  }
})

test('a row below the sixth keeps the last delay instead of starting first', async () => {
  const sheet = await readFile(path.join(ROOT, 'app/globals.css'), 'utf8')
  const rows = sheet.slice(sheet.indexOf('@utility rows-arrive'))
  const block = rows.slice(0, rows.indexOf('\n}\n'))

  assert.match(
    block,
    /& > tr:nth-child\(n \+ 6\) \{\s*animation-delay: 200ms;/,
    'the seventh row and below start at 0ms and overtake the rows above them',
  )
})

test('each settings screen rises on its own, and the frame around it does not', async () => {
  const template = await readFile(
    path.join(ROOT, 'app/(app)/settings/template.tsx'),
    'utf8',
  )
  const shell = await readFile(
    path.join(ROOT, 'components/vela/app-shell.tsx'),
    'utf8',
  )

  assert.match(template, /screen-rises/)
  assert.match(shell, /<ScreenMain\s+rises=\{false\}/)
})

test('the settings of a movement stay on the part that wrote them', async () => {
  const sheet = await readFile(path.join(ROOT, THE_SHEET), 'utf8')

  for (const [name, initial] of [
    ['--rise-from', '55%'],
    ['--rise-squash', '1.2'],
    ['--rise-stretch', '0.9'],
  ]) {
    const at = sheet.indexOf(`@property ${name} {`)

    assert.ok(
      at >= 0,
      `${name} is inherited, so the screen's small rise shrinks every rise inside it`,
    )
    const body = sheet.slice(at, sheet.indexOf('}', at))

    assert.match(body, /inherits: false;/)
    assert.match(
      body,
      new RegExp(`initial-value: ${initial.replace('.', '\\.')};`),
    )
  }
})

test('a guide column rises exactly as the first version did', async () => {
  const sheet = await readFile(path.join(ROOT, THE_SHEET), 'utf8')
  const at = sheet.indexOf('@utility rises {')
  const body = sheet.slice(at, sheet.indexOf('\n}\n', at))

  assert.doesNotMatch(
    body,
    /--rise-|transform-origin/,
    'the rise was tuned away from the first version the user liked',
  )
})
