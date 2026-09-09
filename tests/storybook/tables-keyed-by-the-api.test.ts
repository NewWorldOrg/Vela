import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const WALKED = ['app', 'components', 'hooks', 'lib', 'repository']

const KEYED_BY_THE_API = [
  'CATEGORY_LABEL',
  'CODEC_LABEL',
  'DEINTERLACE_LABEL',
  'DETECTION_NOTE',
  'DISCARD_REFUSAL',
  'DREW',
  'ENCODER_LABEL',
  'FAILURE_CLASS',
  'FAILURE_LABEL',
  'KIND_TEXT',
  'LEVEL_OF_STANDING',
  'LEVEL_OF_STATE',
  'LOSS_SHAPES',
  'METRIC_DROPS',
  'OUTCOME_LABEL',
  'POPULATION_SHAPES',
  'REASON',
  'REASON_VARIANT',
  'REFUSAL_LABEL',
  'REMOVAL_LABEL',
  'RECORDING_OUTCOME_TERMS',
  'RESERVATION_OUTCOME_KIND_TERMS',
  'RESERVATION_STANDING_TERMS',
  'RESOLUTION_LABEL',
  'SESSION_LABEL',
  'SESSION_PURPOSE_LABEL',
  'STANDING',
  'STANDING_LABEL',
  'STATE_LABEL',
  'STATUS_LABEL',
  'SWERVE_LABEL',
  'SYSTEM_LABEL',
  'THRESHOLD_SHAPES',
  'THUMBNAILS',
  'THUMBNAIL_ROWS',
  'TONE',
  'TUNE_FAILURES',
  'UNSAVABLE_NOTE',
  'VARIANT',
]

const READ_STRAIGHT_ON_PURPOSE: Record<string, string[]> = {
  'repository/scan-systems.ts': ['SYSTEM_LABEL'],
  'repository/reservations.ts': ['DISCARD_REFUSAL'],
  'components/recordings/recording-detail-page.tsx': ['OUTCOME_LABEL'],
}

const NOT_SOURCE = new Set(['node_modules'])

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

    if (/\.tsx?$/.test(entry.name)) {
      found.push(relative)
    }
  }

  return found
}

test('a table keyed by an enum the API owns is never read straight', async () => {
  const files: string[] = []

  for (const dir of WALKED) {
    files.push(...(await sourceFiles(dir)))
  }

  assert.ok(
    files.length > 100,
    `only ${files.length} source files were walked, so this test is reading the wrong tree`,
  )

  const straight: string[] = []

  for (const file of files) {
    const text = await readFile(path.join(ROOT, file), 'utf8')
    const allowed = READ_STRAIGHT_ON_PURPOSE[file] ?? []

    for (const table of KEYED_BY_THE_API) {
      if (allowed.includes(table)) {
        continue
      }

      if (new RegExp(String.raw`\b${table}\[`).test(text)) {
        straight.push(`${file}: ${table}[…]`)
      }
    }
  }

  assert.deepEqual(
    straight.sort(),
    [],
    'A table whose keys are an enum the API owns is being read with [], so a ' +
      'value added on the API side and deployed before this bundle gives ' +
      'undefined, and the screen falls over on the next property. Read it ' +
      'with wordFor / shapeFor from @/lib/not-yet-in-this-build instead.',
  )
})

test('every table this test names is still declared where it can be found', async () => {
  const files: string[] = []

  for (const dir of WALKED) {
    files.push(...(await sourceFiles(dir)))
  }

  const declared = new Set<string>()

  for (const file of files) {
    const text = await readFile(path.join(ROOT, file), 'utf8')

    for (const table of KEYED_BY_THE_API) {
      if (new RegExp(String.raw`\bconst ${table}(:|\s*=)`).test(text)) {
        declared.add(table)
      }
    }
  }

  assert.deepEqual(
    KEYED_BY_THE_API.filter((table) => !declared.has(table)),
    [],
    'A table named here is no longer declared anywhere, so this test guards ' +
      'nothing by that name. Take it off the list, or put back what went.',
  )
})
