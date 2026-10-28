import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
)

const PLAYERS = [
  'components/recordings/player.tsx',
  'components/live/live-player.tsx',
]

const LEFT_FOR_LATER = [
  'components/data-broadcast/runtime-script.generated.ts',
  'acorn',
]

const STATIC_IMPORT =
  /^\s*(?:import|export)\s+(?!type\b)(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/gm

async function exists(file: string): Promise<boolean> {
  try {
    await access(path.join(ROOT, file))

    return true
  } catch {
    return false
  }
}

async function resolved(from: string, specifier: string): Promise<string> {
  if (!specifier.startsWith('@/') && !specifier.startsWith('.')) {
    return specifier
  }

  const base = specifier.startsWith('@/')
    ? specifier.slice(2)
    : path.posix.join(path.posix.dirname(from), specifier)

  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
  ]) {
    if (/\.tsx?$/.test(candidate) && (await exists(candidate))) {
      return candidate
    }
  }

  return base
}

async function loadedWith(entry: string): Promise<Set<string>> {
  const seen = new Set<string>()
  const waiting = [entry]

  while (waiting.length > 0) {
    const file = waiting.pop() as string

    if (seen.has(file)) {
      continue
    }

    seen.add(file)

    if (!/\.tsx?$/.test(file)) {
      continue
    }

    const source = await readFile(path.join(ROOT, file), 'utf8')

    for (const [, specifier] of source.matchAll(STATIC_IMPORT)) {
      waiting.push(await resolved(file, specifier))
    }
  }

  return seen
}

test('a player page loads neither the data broadcast runtime nor the parser until the data broadcast opens', async () => {
  for (const player of PLAYERS) {
    const loaded = await loadedWith(player)

    assert.ok(
      loaded.has('components/data-broadcast/data-broadcast-player.tsx'),
      `${player} no longer reaches the data broadcast at all`,
    )

    for (const later of LEFT_FOR_LATER) {
      assert.equal(loaded.has(later), false, `${player} loads ${later}`)
    }
  }
})
