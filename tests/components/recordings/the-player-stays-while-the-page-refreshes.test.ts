import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
)
const THE_DETAIL = 'components/recordings/recording-detail-page.tsx'

test('the player is reopened only for what the address asks, never for the position the server remembers', async () => {
  const source = await readFile(path.join(ROOT, THE_DETAIL), 'utf8')

  assert.match(
    source,
    /key=\{whatOpensThePlayerAnew\(d\.id, startAt, playback\.plan\.source\)\}/,
    'the remount key must be built from the address (startAt), not from opens.at',
  )
  assert.doesNotMatch(
    source,
    /whatOpensThePlayerAnew\([^)]*opens\.at/,
    'opens.at carries plan.resumeAtSec, which the player itself writes every few seconds; keying on it reopens the player at every refresh',
  )
})
