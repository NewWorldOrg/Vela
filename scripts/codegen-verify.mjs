import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const document = 'repository/client/carina.json'
const committed = resolve(root, 'repository/client/schema.ts')
const bin = (name) => resolve(root, 'node_modules/.bin', name)
const scratch = mkdtempSync(join(tmpdir(), 'vela-openapi-'))
const regenerated = join(scratch, 'schema.ts')

try {
  const expected = readFileSync(committed, 'utf8')

  execFileSync(bin('openapi-typescript'), [document, '-o', regenerated], {
    cwd: root,
    stdio: 'inherit',
  })
  execFileSync(
    bin('prettier'),
    ['--config', '.prettierrc.json', '--write', regenerated],
    { cwd: root, stdio: 'inherit' },
  )

  if (readFileSync(regenerated, 'utf8') !== expected) {
    throw new Error(
      `repository/client/schema.ts does not match ${document}; run yarn codegen`,
    )
  }
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
