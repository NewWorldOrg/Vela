/** Bundles the data broadcast runtime into the one script its sandboxed frame is given, and the receiver a Hybridcast application's documents are given into the script this server serves them, or with `--check`, fails when a committed one is not what it would write. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildSync } from 'esbuild'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export const ENTRY = resolve(
  root,
  'components/data-broadcast/bml-runtime-entry.ts',
)

export const BUNDLE = resolve(
  root,
  'components/data-broadcast/runtime-script.generated.ts',
)

export const RECEIVER_ENTRY = resolve(
  root,
  'components/data-broadcast/hybridcast-receiver-entry.ts',
)

export const RECEIVER_BUNDLE = resolve(
  root,
  'public/data-broadcast/hybridcast-receiver.js',
)

function scriptOf(entry) {
  const built = buildSync({
    absWorkingDir: root,
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    minify: true,
    legalComments: 'none',
    platform: 'browser',
    target: ['chrome111', 'edge111', 'firefox111', 'safari16.4'],
    tsconfig: resolve(root, 'tsconfig.json'),
    write: false,
  })

  return built.outputFiles[0].text.trim()
}

export function bundled() {
  const script = scriptOf(ENTRY)

  return `/** The data broadcast runtime as one script, written by scripts/bml-runtime.mjs. */\nexport const RUNTIME_SCRIPT = ${JSON.stringify(script)}\n`
}

export function receiverBundled() {
  return `/* The receiver a Hybridcast application's documents are given, written by scripts/bml-runtime.mjs. */\n${scriptOf(RECEIVER_ENTRY)}\n`
}

const WRITTEN = [
  [BUNDLE, bundled],
  [RECEIVER_BUNDLE, receiverBundled],
]

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  WRITTEN.forEach(([path, write]) => {
    const written = write()

    if (process.argv.includes('--check')) {
      if (readFileSync(path, 'utf8') !== written) {
        throw new Error(
          `${path.slice(root.length + 1)} is not the script as it stands; run yarn bml-runtime`,
        )
      }
    } else {
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, written)
    }
  })
}
