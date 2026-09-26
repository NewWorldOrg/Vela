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

const READ = ['app', 'components']

const NOT_SOURCE = new Set([
  '.git',
  '.next',
  'node_modules',
  'storybook-static',
])

const THE_BUTTON = 'components/ui/button.tsx'

const THE_VARIANTS = [
  'default',
  'outline',
  'ghost',
  'watch',
  'change',
  'halt',
  'remove',
  'removeFill',
]

const BY_MEANING: Record<string, string> = {
  watch: 'brand',
  change: 'sky',
  halt: 'lemon',
  remove: 'coral',
}

const THE_GROUPS = ['ActionRow', 'AlertDialogFooter', 'DialogFooter']

const DOES_NOTHING = ['閉じる', 'キャンセル']

const A_VARIANT_KEY = /^\s{8}([A-Za-z]+):/gm

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

    if (entry.name.endsWith('.tsx')) {
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

async function theButton(): Promise<string> {
  return await readFile(path.join(ROOT, THE_BUTTON), 'utf8')
}

function variantsIn(button: string): Map<string, string> {
  const declared = new Map<string, string>()
  const block = button.slice(
    button.indexOf('variant: {'),
    button.indexOf('size: {'),
  )

  for (const key of block.matchAll(A_VARIANT_KEY)) {
    const from = block.indexOf(key[1], key.index)
    const rest = block.slice(from)
    const said = rest.match(/'([^']*)'/u)

    declared.set(key[1], said ? said[1] : '')
  }

  return declared
}

function groupsIn(source: string): { kind: string; body: string }[] {
  const found: { kind: string; body: string }[] = []

  for (const kind of THE_GROUPS) {
    let at = 0

    for (;;) {
      const opens = source.indexOf(`<${kind}`, at)

      if (opens === -1) {
        break
      }

      const closes = source.indexOf(`</${kind}>`, opens)

      if (closes === -1) {
        break
      }

      found.push({ kind, body: source.slice(opens, closes) })
      at = closes + 1
    }
  }

  return found
}

test('the colours an action can wear are declared in one place', async () => {
  const declared = variantsIn(await theButton())

  assert.deepEqual(
    [...declared.keys()].sort(),
    [...THE_VARIANTS].sort(),
    'the button wears a set of colours the canon does not name, or has lost ' +
      'one it does. The table in the canon is the only place a meaning is ' +
      'paired with a colour',
  )
})

test('a colour is a ground, a word and an outline of the same hue', async () => {
  const declared = variantsIn(await theButton())

  for (const [name, hue] of Object.entries(BY_MEANING)) {
    const drawn = declared.get(name) ?? ''

    assert.ok(
      drawn.includes(`bg-${hue}-soft`),
      `${name} is not drawn on the pale ${hue} ground`,
    )
    assert.ok(
      drawn.includes(`text-${hue}`),
      `${name} does not say its word in ${hue}`,
    )
    assert.ok(
      drawn.includes(`border-${hue}-line`),
      `${name} has no outline of its own hue`,
    )
  }

  const fill = declared.get('removeFill') ?? ''

  assert.ok(fill.includes('bg-coral'), 'the confirming button is not filled')
  assert.ok(fill.includes('text-on-coral'))
})

test('the colour of a state is never the colour of an action', async () => {
  const declared = variantsIn(await theButton())

  for (const [name, drawn] of declared) {
    assert.ok(
      !drawn.includes('mint'),
      `${name} wears mint, which is a state colour (good, complete, well) ` +
        'and not something a press does',
    )
  }
})

test('no group of actions holds a colourless press', async () => {
  const bare: string[] = []
  let groups = 0

  for (const { file, source } of await everySource()) {
    for (const group of groupsIn(source)) {
      groups++

      if (group.body.includes('variant="outline"')) {
        bare.push(`${file}: a ${group.kind} holds an outline press`)
      }

      if (
        group.body.includes('variant="ghost"') &&
        !DOES_NOTHING.some((word) => group.body.includes(word))
      ) {
        bare.push(
          `${file}: a ${group.kind} holds a ghost press next to coloured ones`,
        )
      }
    }
  }

  assert.ok(groups > 10, `only ${groups} groups of actions were read`)
  assert.deepEqual(
    bare,
    [],
    'a group of actions mixes a colourless press in with coloured ones. ' +
      'Every press that does something takes the colour of its meaning; only ' +
      '閉じる and キャンセル stay colourless',
  )
})

test('the orphan variants are gone from the button', async () => {
  const button = await theButton()

  assert.doesNotMatch(
    button,
    /^\s+link:/mu,
    'the link variant is back, and it is worn in one place only',
  )

  for (const { file, source } of await everySource()) {
    assert.doesNotMatch(
      source,
      /<Button\b[^>]*variant="(link|destructive|destructiveFill)"/u,
      `${file} wears a colour the canon no longer names`,
    )
  }
})
