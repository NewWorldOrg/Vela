import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const WHERE_THE_ACTIONS_ARE = [
  'components/library/recording-row.tsx',
  'components/recordings/recording-actions.tsx',
  'components/recordings/external-player.tsx',
  'components/recordings/thumbnail-button.tsx',
  'components/recordings/encode-button.tsx',
]

const THE_GROUPS = [
  'components/library/recording-row.tsx',
  'components/recordings/recording-actions.tsx',
]

const WHERE_THE_EVEN_WIDTH_IS_DECLARED = 'components/vela/action-row.tsx'

const A_BUTTON = /<Button\b([^>]*)>([\s\S]*?)<\/Button>/g

const SPEAKS_FOR_ITSELF = /variant="(watch|change|halt|remove|removeFill)"/

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
      if (!SPEAKS_FOR_ITSELF.test(button.declared)) {
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
      assert.match(button.declared, /variant="remove"/)
    }
  }

  for (const file of THE_GROUPS) {
    assert.ok(deleting.includes(file), `${file} offers no deleting`)
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
