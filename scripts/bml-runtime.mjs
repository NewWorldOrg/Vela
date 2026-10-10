/** Bundles the data broadcast runtime into the one script its sandboxed frame is given, or with `--check`, fails when the committed one is not what it would write. */
import { readFileSync, writeFileSync } from 'node:fs'
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

export function bundled() {
  const built = buildSync({
    absWorkingDir: root,
    entryPoints: [ENTRY],
    bundle: true,
    format: 'iife',
    minify: true,
    legalComments: 'none',
    platform: 'browser',
    target: ['chrome111', 'edge111', 'firefox111', 'safari16.4'],
    tsconfig: resolve(root, 'tsconfig.json'),
    write: false,
  })
  const script = built.outputFiles[0].text.trim()

  return `/** The data broadcast runtime as one script, written by scripts/bml-runtime.mjs. */\nexport const RUNTIME_SCRIPT = ${JSON.stringify(script)}\n`
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const written = bundled()

  if (process.argv.includes('--check')) {
    if (readFileSync(BUNDLE, 'utf8') !== written) {
      throw new Error(
        'components/data-broadcast/runtime-script.generated.ts is not the runtime as it stands; run yarn bml-runtime',
      )
    }
  } else {
    writeFileSync(BUNDLE, written)
  }
}
