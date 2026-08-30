import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

/**
 * Whether the unit suite that ran was the whole of it.
 *
 * `yarn test` names the files by three globs, and a test that falls outside
 * them is not a failing test — it is no test at all, and the run is green
 * without it. That is one rename away: `repository/search.test.ts` to
 * `search.spec.ts` takes every assertion in it out of CI and changes nothing
 * anybody would notice, because nothing anywhere counts what was picked up.
 *
 * So the tree is walked for everything that asks Node for a test runner, and
 * every one of them has to sit where a glob reaches. The count has a floor
 * under it as well, because a walk that found nothing would satisfy the first
 * claim on its own — which is the shape of the hole this is here to close.
 */

/** What `yarn test` is told to run, spelled here so changing it is deliberate. */
const TOLD_TO_RUN = [
  'lib/**/*.test.ts',
  'repository/**/*.test.ts',
  '.storybook/**/*.test.ts',
]

/**
 * Every test file there is, named rather than counted.
 *
 * A floor on the count is the obvious thing and it drifts: set to the number
 * that stood when it was written, it stops biting the moment a file is added,
 * because the next deletion only takes the total back to where the floor is.
 * That was measured — a floor of 8 over 9 files let one be deleted in silence.
 * Naming them means an addition is a line here and a removal is a red run.
 */
const THE_SUITE = [
  '.storybook/cursor-exempt.test.ts',
  '.storybook/every-test-runs.test.ts',
  '.storybook/tap-exempt.test.ts',
  'lib/dismiss.test.ts',
  'lib/format.test.ts',
  'lib/guide.test.ts',
  'lib/reservations.test.ts',
  'lib/rules.test.ts',
  'lib/search-condition.test.ts',
  'lib/state-terms.test.ts',
  'repository/client/carina.test.ts',
  'repository/integrity.test.ts',
  'repository/recordings.test.ts',
  'repository/reservations.test.ts',
  'repository/rules.test.ts',
  'repository/tuners.test.ts',
  'repository/search.test.ts',
  'repository/tuning.test.ts',
]

/** How a file says it is one of these tests. */
const ASKS_FOR_THE_RUNNER = "'node:test'"

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
    const relative = path.posix.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (!NOT_SOURCE.has(entry.name)) {
        found.push(...(await sourceFiles(relative)))
      }
      continue
    }

    if (/\.(ts|tsx|mjs)$/.test(entry.name)) {
      found.push(relative)
    }
  }

  return found
}

/** A glob of the one shape used here: everything under a directory, by suffix. */
function reached(file: string): boolean {
  return TOLD_TO_RUN.some((glob) => {
    const [dir, leaf] = glob.split('/**/')

    return file.startsWith(`${dir}/`) && file.endsWith(leaf.replace('*', ''))
  })
}

test('the globs the run is given are the ones this test knows about', async () => {
  const manifest = JSON.parse(
    await readFile(path.join(ROOT, 'package.json'), 'utf8'),
  ) as { scripts: Record<string, string> }
  const quoted = manifest.scripts.test.match(/"[^"]+"/g) ?? []

  assert.deepEqual(
    quoted.map((one) => one.slice(1, -1)),
    TOLD_TO_RUN,
    'yarn test names different files from the ones this test walks for, so ' +
      'what it says about the suite being whole no longer follows.',
  )
})

test('every test in the tree sits where the run will find it', async () => {
  const files = await sourceFiles('.')

  assert.ok(
    files.length > 100,
    `only ${files.length} source files were walked, so this test is reading the wrong tree`,
  )

  const tests: string[] = []
  for (const file of files) {
    const text = await readFile(path.join(ROOT, file), 'utf8')

    if (text.includes(ASKS_FOR_THE_RUNNER)) {
      tests.push(file.replace(/^\.\//, ''))
    }
  }

  assert.deepEqual(
    tests.sort(),
    [...THE_SUITE].sort(),
    'The tests in the tree are not the ones this repository knows it has. A ' +
      'file that has gone, or been renamed out of the suite, is not a failing ' +
      'test — it is no test at all, and CI is green without it. Add a new one ' +
      'to THE_SUITE, or put back what went.',
  )

  assert.deepEqual(
    tests.filter((file) => !reached(file)),
    [],
    'A test file is somewhere yarn test does not look, so it is not run and ' +
      'not reported — it is simply absent, and CI is green without it. Move ' +
      'it under one of the globs, or add its directory to both the script and ' +
      'TOLD_TO_RUN here.',
  )
})
