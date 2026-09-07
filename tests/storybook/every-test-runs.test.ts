import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const TOLD_TO_RUN = ['tests/**/*.test.ts']

const THE_SUITE = [
  'tests/lib/capture-name.test.ts',
  'tests/lib/dismiss.test.ts',
  'tests/lib/encode.test.ts',
  'tests/lib/format.test.ts',
  'tests/lib/guide.test.ts',
  'tests/lib/live-caption-drift.test.ts',
  'tests/lib/live-captions.test.ts',
  'tests/lib/live-fold.test.ts',
  'tests/lib/live-latency.test.ts',
  'tests/lib/live-lineup.test.ts',
  'tests/lib/live-profiles.test.ts',
  'tests/lib/live-startup.test.ts',
  'tests/lib/live-wire.test.ts',
  'tests/lib/player-keys.test.ts',
  'tests/lib/program-title.test.ts',
  'tests/lib/recordings.test.ts',
  'tests/lib/reservation-outcomes.test.ts',
  'tests/lib/reservations.test.ts',
  'tests/lib/rules.test.ts',
  'tests/lib/search-condition.test.ts',
  'tests/lib/state-terms.test.ts',
  'tests/lib/thumbnail-redraw.test.ts',
  'tests/repository/client/carina.test.ts',
  'tests/repository/collection.test.ts',
  'tests/repository/driver-capabilities.test.ts',
  'tests/repository/encode.test.ts',
  'tests/repository/integrity.test.ts',
  'tests/repository/live-sessions.test.ts',
  'tests/repository/live.test.ts',
  'tests/repository/programs.test.ts',
  'tests/repository/recordings.test.ts',
  'tests/repository/reservation-outcomes.test.ts',
  'tests/repository/reservations.test.ts',
  'tests/repository/rules.test.ts',
  'tests/repository/said.test.ts',
  'tests/repository/search.test.ts',
  'tests/repository/sessions.test.ts',
  'tests/repository/tuners.test.ts',
  'tests/repository/tuning.test.ts',
  'tests/repository/video-paths.test.ts',
  'tests/repository/videos.test.ts',
  'tests/storybook/cursor-exempt.test.ts',
  'tests/storybook/every-test-runs.test.ts',
  'tests/storybook/screen-main.test.ts',
  'tests/storybook/tap-exempt.test.ts',
]

const ASKS_FOR_THE_RUNNER = "'node:test'"

const NOT_SOURCE = new Set([
  '.git',
  '.next',
  'node_modules',
  'storybook-static',
  'test-results',
])

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

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
