import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const THE_ROW = 'components/library/recording-row.tsx'

const THE_PHONE_ROWS = 'components/library/phone-library.tsx'

const THE_CHIPS = 'components/library/attention-chips.tsx'

const A_CHIP = /<([A-Z][A-Za-z]*Chip)\b([^>]*?)\/?>/g

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
)

async function read(file: string): Promise<string> {
  return await readFile(path.join(ROOT, file), 'utf8')
}

test('a library row says its states through the one set of chips, on a phone and on a wide screen alike', async () => {
  for (const file of [THE_ROW, THE_PHONE_ROWS]) {
    const source = await read(file)

    assert.match(source, /<AttentionChips\b/, `${file} says no state`)
    assert.deepEqual(
      [...source.matchAll(A_CHIP)].map((one) => one[1]),
      [],
      `${file} draws a chip of its own beside the set`,
    )
  }
})

test('the chips a library row says are pills, never the dot and word of a column', async () => {
  const chips = await read(THE_CHIPS)
  const said = [...chips.matchAll(A_CHIP)]

  assert.ok(said.length > 4, `only ${said.length} chips were read`)

  for (const chip of said) {
    assert.doesNotMatch(
      chip[2],
      /(^|\s)say(\s|$|=)/,
      `${chip[1]} is said as a column’s dot and word in the row’s state, where v4 lays a chip`,
    )
  }
})
