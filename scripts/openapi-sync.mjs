import { execFileSync } from 'node:child_process'
import { copyFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const checkout = resolve(root, process.env.CARINA_CHECKOUT ?? '../Carina')
const document = 'openapi/Carina.Api.json'

const dirty = execFileSync(
  'git',
  ['-C', checkout, 'status', '--porcelain', '--', document],
  { encoding: 'utf8' },
).trim()

if (dirty !== '') {
  throw new Error(
    `${document} is modified in ${checkout}; commit and push it before pinning a ref`,
  )
}

const ref = execFileSync('git', ['-C', checkout, 'rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim()

copyFileSync(resolve(checkout, document), resolve(root, document))
writeFileSync(resolve(root, 'openapi/carina-ref.txt'), `${ref}\n`)

process.stdout.write(`${ref}\n`)
