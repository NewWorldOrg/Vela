import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const WHERE_THE_ACTIONS_ARE = [
  'components/library/phone-library.tsx',
  'components/recordings/recording-actions.tsx',
  'components/recordings/external-player.tsx',
  'components/recordings/thumbnail-button.tsx',
  'components/recordings/encode-button.tsx',
]

const THE_GROUPS = ['components/recordings/recording-actions.tsx']

const THE_LIBRARY_ROW = 'components/library/recording-row.tsx'

const WHERE_THE_EVEN_WIDTH_IS_DECLARED = 'components/vela/action-row.tsx'

const A_BUTTON = /<Button\b([^>]*)>([\s\S]*?)<\/Button>/g

const SPEAKS_FOR_ITSELF = /variant="(tone|play|process|redo|danger)"/

/** Leaving a dialog does nothing, so it says only its word. */
const DOES_NOTHING = ['キャンセル', '閉じる']

const AN_ICON = /<[A-Z][A-Za-z]*Icon\b|<Spinner\b/

const DELETES = /<TrashIcon\b/

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
)

async function buttonsIn(file: string) {
  const source = await readFile(path.join(ROOT, file), 'utf8')

  return [...source.matchAll(A_BUTTON)].map((button) => ({
    file,
    declared: button[1],
    body: button[2],
  }))
}

test('an action is an icon and a word, never one without the other', async () => {
  const drawn: string[] = []

  for (const file of WHERE_THE_ACTIONS_ARE) {
    for (const button of await buttonsIn(file)) {
      if (
        !SPEAKS_FOR_ITSELF.test(button.declared) ||
        DOES_NOTHING.some((word) => button.body.trim().endsWith(word))
      ) {
        continue
      }

      drawn.push(`${button.file}: ${button.body.trim()}`)
      assert.match(button.body, AN_ICON)
      assert.doesNotMatch(button.declared, /size="icon/)
    }
  }

  assert.ok(drawn.length > 3, `only ${drawn.length} actions were read`)
})

test('deleting is destructive wherever it is offered', async () => {
  const deleting: string[] = []

  for (const file of WHERE_THE_ACTIONS_ARE) {
    for (const button of await buttonsIn(file)) {
      if (!DELETES.test(button.body)) {
        continue
      }

      deleting.push(button.file)
      assert.match(button.declared, /variant="danger"/)
    }
  }

  for (const file of THE_GROUPS) {
    assert.ok(deleting.includes(file), `${file} offers no deleting`)
  }
})

test('the library row deletes from its menu, as a destructive item', async () => {
  const row = await readFile(path.join(ROOT, THE_LIBRARY_ROW), 'utf8')
  const item = row.match(
    /<DropdownMenuItem\b([^>]*)>([\s\S]*?)<\/DropdownMenuItem>/,
  )

  assert.ok(item, `${THE_LIBRARY_ROW} offers no deleting`)
  assert.match(item[2], DELETES)
  assert.match(item[1], /variant="destructive"/)
})

test("a recording's actions are each drawn on a ground", async () => {
  const actions = await readFile(
    path.join(ROOT, 'components/recordings/recording-actions.tsx'),
    'utf8',
  )

  assert.doesNotMatch(
    actions,
    /\bquiet\b/,
    'an action of a recording is drawn as a word alone',
  )
  assert.doesNotMatch(actions, /data-variant=ghost/)

  for (const [file, variant] of [
    ['components/recordings/encode-button.tsx', 'process'],
    ['components/recordings/thumbnail-button.tsx', 'redo'],
  ]) {
    const source = await readFile(path.join(ROOT, file), 'utf8')

    assert.doesNotMatch(source, /\bquiet\b|ghost/, file)
    assert.match(source, new RegExp(`variant="${variant}"`), file)
  }
})

test('a group of actions is laid out by the one row', async () => {
  for (const file of THE_GROUPS) {
    const source = await readFile(path.join(ROOT, file), 'utf8')

    assert.match(source, /<ActionRow\b/)
    assert.match(source, /from '@\/components\/vela\/action-row'/)
  }
})

test('how wide the actions in a group are is declared in one file', async () => {
  const source = await readFile(
    path.join(ROOT, WHERE_THE_EVEN_WIDTH_IS_DECLARED),
    'utf8',
  )

  assert.match(source, /auto-cols-fr/)

  for (const file of THE_GROUPS) {
    assert.doesNotMatch(
      await readFile(path.join(ROOT, file), 'utf8'),
      /auto-cols-fr/,
    )
  }
})

test("a recording's actions stand in one row under its title, not in a column beside it", async () => {
  const actions = await readFile(
    path.join(ROOT, 'components/recordings/recording-actions.tsx'),
    'utf8',
  )
  const page = await readFile(
    path.join(ROOT, 'components/recordings/recording-detail-page.tsx'),
    'utf8',
  )

  assert.doesNotMatch(actions, /'column'/)
  assert.doesNotMatch(page, /laid="column"/)

  const order = [
    '<ExternalPlayerOpener',
    '<EncodeButton',
    '<ThumbnailButton',
    '<TrashIcon',
  ].map((part) => actions.indexOf(part))

  assert.ok(order.every((at) => at >= 0))
  assert.deepEqual(
    order,
    [...order].sort((a, b) => a - b),
  )
})

test("recording a programme is drawn in the recording's red", async () => {
  const area = await readFile(
    path.join(ROOT, 'components/guide/reservation-area.tsx'),
    'utf8',
  )

  assert.match(area, /<RecordIcon className=\{first \? 'text-rec'/)
  assert.doesNotMatch(area, /text-warn/)
})
