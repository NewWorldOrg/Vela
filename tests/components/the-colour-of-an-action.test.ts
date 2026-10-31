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

const THE_VARIANTS = ['default', 'tone', 'ghost', 'danger', 'dangerFill']

/** The ground and the word each kind of press is drawn in, as the canon's table of buttons pairs them. */
const BY_KIND: Record<string, [string, string]> = {
  default: ['bg-btn', 'text-on-ink'],
  tone: ['bg-surface-2', 'text-ink'],
  ghost: ['bg-transparent', 'text-ink-2'],
  danger: ['bg-transparent', 'text-acc-text'],
  dangerFill: ['bg-accent-soft', 'text-acc-text'],
}

const THE_GROUPS = ['ActionRow', 'AlertDialogFooter', 'DialogFooter']

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

test('each kind of press is drawn on its ground in its word', async () => {
  const declared = variantsIn(await theButton())

  for (const [name, [ground, word]] of Object.entries(BY_KIND)) {
    const drawn = declared.get(name) ?? ''

    assert.ok(drawn.includes(ground), `${name} is not drawn on ${ground}`)
    assert.ok(drawn.includes(word), `${name} does not say its word in ${word}`)
  }
})

test('the accent is never the ground of a press', async () => {
  const declared = variantsIn(await theButton())

  for (const [name, drawn] of declared) {
    assert.doesNotMatch(
      drawn,
      /(^|\s)bg-accent(\s|$)/u,
      `${name} fills a press with the accent, which only marks things`,
    )
    assert.doesNotMatch(
      drawn,
      /border-/u,
      `${name} draws an outline, and v4 draws none`,
    )
  }
})

test('a group of actions holds one primary press at most', async () => {
  const crowded: string[] = []
  let groups = 0

  for (const { file, source } of await everySource()) {
    for (const group of groupsIn(source)) {
      groups++

      const primaries = [
        ...group.body.matchAll(/<(Button|AlertDialogAction)\b([^>]*)>/gu),
      ].filter((one) => one[1] === 'Button' && !/variant=/u.test(one[2])).length

      if (primaries > 1) {
        crowded.push(`${file}: a ${group.kind} holds ${primaries} primaries`)
      }
    }
  }

  assert.ok(groups > 10, `only ${groups} groups of actions were read`)
  assert.deepEqual(
    crowded,
    [],
    'a group of actions offers more than one primary press. One press in a ' +
      'group is the main one; the rest are tone, ghost or danger',
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
      /<Button\b[^>]*variant="(link|destructive|destructiveFill|outline|watch|change|halt|remove|removeFill)"/u,
      `${file} wears a colour the canon no longer names`,
    )
  }
})
