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

const THE_DRAWINGS = [
  'components/vela/vela-mark.tsx',
  'components/vela/usher.tsx',
  'components/vela/television-boat.tsx',
]

const readTheDrawings = async () =>
  (await Promise.all(THE_DRAWINGS.map(read))).join('\n')

test('the mark at the top left is drawn in its small cut', async () => {
  assert.match(
    await read('components/vela/brand.tsx'),
    /<VelaMark small className="size-5" \/>/,
  )
})

test('the mark is the keel and the sail crossing in the star, painted by its own tokens', async () => {
  const source = await readTheDrawings()
  const painted = [...source.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{3,6})"/g)]

  assert.deepEqual(
    [...new Set(painted.map(([, colour]) => colour))].sort(),
    ['#000', '#fff'],
    'a colour other than the black and white of a mask is written into the marks',
  )
  const mark = source.slice(
    source.indexOf('export function VelaMark('),
    source.indexOf('export type UsherMood'),
  )

  assert.match(mark, /d=\{KEEL\} className="stroke-\(--mark-keel\)"/)
  assert.match(mark, /d=\{SAIL\} className="stroke-\(--mark-sail\)"/)
  assert.match(mark, /className="stroke-\(--mark-star\)"\s+mask=/)
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
  const source = await read('components/vela/usher.tsx')
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

test('the curtain carries the television of the app icon, rimmed in the ground colour, and not the usher', async () => {
  const source = await read('components/vela/television-boat.tsx')
  const curtain = await read('components/vela/curtain.tsx')

  assert.match(source, /edged && \(\s*<g data-edge=""/)
  assert.match(source, /'fill-spark', edged && 'stroke-bg'/)
  assert.match(curtain, /<TelevisionBoat edged /)
  assert.doesNotMatch(curtain, /<Usher\b/)
})

test('the mark keeps the colours of the app icon in both themes', async () => {
  const tokens = await read('app/globals.css')
  const icon = await read('app/icon.svg')

  for (const colour of [
    '#356fa5',
    '#3f6461',
    '#efb440',
    '#8fc0ea',
    '#96bbb4',
  ]) {
    assert.match(tokens, new RegExp(`--mark-[a-z]+: ${colour};`))
    assert.match(icon.toLowerCase(), new RegExp(colour))
  }
})

test('the drawings are the mark, the usher of the empty states and the television under sail of the loading curtain', async () => {
  const source = await readTheDrawings()

  assert.deepEqual(
    [...source.matchAll(/export function ([A-Z]\w*)/g)].map(([, name]) => name),
    ['VelaMark', 'Usher', 'TelevisionBoat'],
  )
})
