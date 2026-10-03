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

const THE_ONE_THAT_LISTENS = 'hooks/useFullscreen.ts'

const PLAYERS = [
  'components/recordings/player.tsx',
  'components/live/live-player.tsx',
]

async function sourceFiles(dir: string): Promise<string[]> {
  const found: string[] = []

  for (const entry of await readdir(path.join(ROOT, dir), {
    withFileTypes: true,
  })) {
    const relative = path.posix.join(dir, entry.name)

    if (entry.isDirectory()) {
      found.push(...(await sourceFiles(relative)))
    } else if (/\.tsx?$/.test(entry.name)) {
      found.push(relative)
    }
  }

  return found
}

test('whether a player is in fullscreen is heard in one place, and never copied into state', async () => {
  const listening: string[] = []

  for (const dir of ['app', 'components', 'hooks', 'lib']) {
    for (const file of await sourceFiles(dir)) {
      const source = await readFile(path.join(ROOT, file), 'utf8')

      if (
        file !== THE_ONE_THAT_LISTENS &&
        source.includes('fullscreenchange')
      ) {
        listening.push(file)
      }
    }
  }

  assert.deepEqual(listening, [])
})

test('both players read and switch fullscreen through the shared hook, and say when they fill the window', async () => {
  for (const file of PLAYERS) {
    const source = await readFile(path.join(ROOT, file), 'utf8')

    assert.match(
      source,
      /const \{\s*full,\s*filled,\s*toggle: toggleFullscreen,?\s*\} = useFullscreen\(shell\)/,
      file,
    )
    assert.match(source, /data-full=\{full \? 'true' : undefined\}/, file)
    assert.match(source, /data-fill=\{filled \? 'true' : undefined\}/, file)
    assert.doesNotMatch(source, /setFull\(/, file)
  }
})
