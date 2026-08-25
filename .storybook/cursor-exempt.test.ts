import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

/**
 * `data-cursor-exempt` takes a control out of the pointer probe in
 * test-runner.ts, so every use of it is a control nobody reads — the one way
 * past that gate that leaves the run green. The probe cannot police its own
 * waiver, because a waived control is exactly the one it never looks at. This
 * does.
 *
 * SPEC's 触れる感触 leaves no opening: what can be pressed says so under the
 * pointer, and the list below is empty because nothing in Vela is pressable
 * without being pressable. An entry here is a design-system change before it is
 * a code change.
 */
const WAIVED: string[] = []

/**
 * `cursor-default` is the other way out, and a quieter one: it needs no
 * attribute and reads as a deliberate choice rather than as a waiver. It is
 * also what shadcn ships on the rows of a list and a menu, which is where this
 * arrived from in the first place.
 *
 * Only the two scroll affordances of an open list keep it. They are not pressed
 * — pointing at one scrolls the list, and a click does nothing — so `pointer`
 * would promise a press that is not there. Radix draws them as an `aria-hidden`
 * div carrying no role, so the probe never reads them either way, and this
 * line, not the probe, is what holds them. SPEC names them as the one exception
 * for the same reason.
 */
const KEEPS_DEFAULT = [
  "components/ui/select.tsx | 'flex cursor-default items-center justify-center py-1',",
  "components/ui/select.tsx | 'flex cursor-default items-center justify-center py-1',",
]

/**
 * `data-cursor-shut` is the third way out, and the narrow one. A drawer the
 * screen has shut is `inert` and `aria-hidden` and its controls are genuinely
 * out of reach, which is indistinguishable from a page someone has taken away
 * from the probe — so the screen says which it is, and the probe reads every
 * control the story drew that is not behind an open layer or one of these.
 *
 * Two drawers have it, and the mark goes on only while they are shut.
 */
const SHUT = [
  "components/guide/collection-drawer.tsx | data-cursor-shut={!open ? 'the drawer is shut' : undefined}",
  "components/guide/program-panel.tsx | data-cursor-shut={!open ? 'the panel is shut' : undefined}",
]

/**
 * Files that only name the mark — the probe that honours the attribute, and
 * this test. Named rather than skipped by directory, so that a waiver written
 * into a decorator or a preview is still caught.
 */
const NAMES_EXEMPT = new Set([
  '.storybook/test-runner.ts',
  '.storybook/cursor-exempt.test.ts',
])
const NAMES_DEFAULT = new Set(['.storybook/cursor-exempt.test.ts'])
const NAMES_SHUT = new Set([
  '.storybook/test-runner.ts',
  '.storybook/cursor-exempt.test.ts',
])

/** Build output and dependencies, which are not this repository's own source. */
const NOT_SOURCE = new Set([
  '.git',
  '.next',
  'node_modules',
  'storybook-static',
  'test-results',
])

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function sourceFiles(dir: string): Promise<string[]> {
  const found: string[] = []

  for (const entry of await readdir(path.join(ROOT, dir), {
    withFileTypes: true,
  })) {
    const relative = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (!NOT_SOURCE.has(entry.name)) {
        found.push(...(await sourceFiles(relative)))
      }
      continue
    }

    if (/\.(ts|tsx|css|mjs|json)$/.test(entry.name)) {
      found.push(relative)
    }
  }

  return found
}

/**
 * Every line carrying the mark, as `path | the line`.
 *
 * The line and not the file, because a file is a coarse enough waiver to hide a
 * second use behind the first: `select.tsx` is on the list below for its two
 * scroll affordances, and while the waiver was the file's name, any new
 * `cursor-default` anywhere in it was covered by them. The line and not its
 * number, so that moving the code does not move the waiver.
 */
async function linesCarrying(
  mark: string,
  onlyNames: Set<string>,
): Promise<string[]> {
  const files = await sourceFiles('.')
  assert.ok(
    files.length > 100,
    `only ${files.length} source files were walked, so this test is reading the wrong tree`,
  )

  const uses: string[] = []
  for (const file of files) {
    if (onlyNames.has(file)) {
      continue
    }
    for (const line of (await readFile(path.join(ROOT, file), 'utf8')).split(
      '\n',
    )) {
      if (line.includes(mark)) {
        uses.push(`${file} | ${line.trim()}`)
      }
    }
  }

  return uses.sort()
}

test('the pointer probe is waived where SPEC says, and nowhere else', async () => {
  assert.deepEqual(
    await linesCarrying('data-cursor-exempt', NAMES_EXEMPT),
    [...WAIVED].sort(),
    'A control was taken out of the pointer probe somewhere SPEC does not ' +
      'allow it, or the probe stopped honouring the attribute. Say ' +
      '`cursor-pointer` on it instead — see the 触れる感触 section of the ' +
      'design system.',
  )
})

test('nothing tells the pointer to stay a plain arrow but the two SPEC names', async () => {
  assert.deepEqual(
    await linesCarrying('cursor-default', NAMES_DEFAULT),
    [...KEEPS_DEFAULT].sort(),
    'Something that can be pressed was told to keep the plain arrow. That is ' +
      "shadcn's default for the rows of a list and a menu, and it is the " +
      'reason the rows here read as unpressable for as long as they did.',
  )
})

test('only a drawer the screen has shut is out of the probe’s reach', async () => {
  assert.deepEqual(
    await linesCarrying('data-cursor-shut', NAMES_SHUT),
    [...SHUT].sort(),
    'Something was marked as a shut drawer, which takes its controls out of ' +
      'the probe without a word. Only a drawer that is `inert` while it is ' +
      'closed may carry it, and only while it is closed.',
  )
})
