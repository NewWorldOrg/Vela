import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const STORY_RUNS = ['test-storybook', 'test-storybook:ci']

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

test('every story run says how many browsers it opens at once', async () => {
  const manifest = JSON.parse(
    await readFile(path.join(ROOT, 'package.json'), 'utf8'),
  ) as { scripts: Record<string, string> }

  for (const name of STORY_RUNS) {
    assert.match(
      manifest.scripts[name] ?? '',
      /--maxWorkers=\d+%?(\s|"|\\|$)/,
      `yarn ${name} leaves the worker count to the runner, which opens one ` +
        'browser for every core but one. They all start their first story ' +
        'at the same moment, the machine is oversubscribed several times ' +
        'over, and the first story of a file runs out of its time limit ' +
        'and takes the rest of the file with it.',
    )
  }
})
