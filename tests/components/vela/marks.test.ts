import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
)

const read = (file: string) => readFile(path.join(ROOT, file), 'utf8')

test('the mark at the top left is the small cut', async () => {
  assert.match(
    await read('components/vela/app-shell.tsx'),
    /<VelaMark small className="size-4" \/>/,
  )
})

test('the marks are painted by the tokens, never by a colour of their own', async () => {
  const source = await read('components/vela/marks.tsx')
  const painted = [...source.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{3,6})"/g)]

  assert.deepEqual(
    [...new Set(painted.map(([, colour]) => colour))].sort(),
    ['#000', '#fff'],
    'a colour other than the black and white of a mask is written into the marks',
  )
  for (const token of ['stroke-brand', 'stroke-sky', 'stroke-spark']) {
    assert.match(source, new RegExp(token))
  }
  for (const token of ['fill-brand', 'fill-sky', 'fill-spark']) {
    assert.match(source, new RegExp(token))
  }
})

const USHER_MOVEMENTS = [
  'hull',
  'leap',
  'squash',
  'sway',
  'blink',
  'star',
  'spark',
  'peek',
  'peek-squash',
  'wilt',
  'blink-once',
  'star-sink',
  'sweat',
  'answer',
  'answer-sway',
  'answer-star',
]

const BOBS_WHERE_LESS_IS_ASKED = ['squash', 'peek-squash', 'answer']

test('the usher moves once, and not for someone who stopped the motion', async () => {
  const sheet = await read('app/globals.css')
  const asked = sheet.match(
    /@media \(prefers-reduced-motion: reduce\) \{\s*:root:not\(\[data-motion='moves'\]\) \{([\s\S]*?)\n    \}/,
  )![1]
  const switched = sheet.match(
    /:root\[data-motion='still'\] \{([\s\S]*?)\n  \}/,
  )![1]

  for (const name of USHER_MOVEMENTS) {
    assert.match(
      sheet,
      new RegExp(`--animate-usher-${name}: usher-${name} [^;]*both;`),
    )
    assert.doesNotMatch(
      sheet,
      new RegExp(`--animate-usher-${name}: [^;]*infinite`),
      `the usher's ${name} loops`,
    )
    assert.match(
      switched,
      new RegExp(`--animate-usher-${name}: none;`),
      `the usher's ${name} keeps moving for someone who switched motion off`,
    )
    assert.match(
      asked,
      new RegExp(
        `--animate-usher-${name}: ${
          BOBS_WHERE_LESS_IS_ASKED.includes(name) ? 'usher-bob ' : 'none;'
        }`,
      ),
      `the usher's ${name} does not keep to the one small bob where the machine asks for less motion`,
    )
  }
  assert.match(asked, /--usher-quick: 0\.26s;/)
  assert.doesNotMatch(sheet, /@keyframes twinkle\b/)
})

test('the usher stands still until it arrives, and waits without moving', async () => {
  const source = await read('components/vela/marks.tsx')
  const sheet = await read('app/globals.css')
  const utility = sheet.slice(
    sheet.indexOf('@utility usher-arrives {'),
    sheet.indexOf('\n}\n', sheet.indexOf('@utility usher-arrives {')),
  )

  assert.match(source, /transform="scale\(1 0\)"/, 'a lid is drawn shut')
  assert.match(
    source,
    /data-part="sweat"\s*\/>|opacity=\{0\}\s*data-part="sweat"/,
  )
  assert.doesNotMatch(utility, /infinite|iteration-count/)
  assert.match(utility, /\[data-answering\] > & \[data-part='answer'\]/)
})

test('the drawings the usher replaced are gone', async () => {
  await assert.rejects(read('components/vela/spot-illustration.tsx'))
})

test('the usher standing on the curtain is rimmed in the ground colour', async () => {
  const source = await read('components/vela/marks.tsx')

  assert.match(source, /edged && \(\s*<g\s+className="stroke-bg"/)
  assert.match(source, /className="fill-spark stroke-bg"/)
})
