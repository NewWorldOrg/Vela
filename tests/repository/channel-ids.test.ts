import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { mock, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

import { searchConditionOfQuery } from '@/lib/search-condition'
import { AERIAL_CHANNEL_FIXTURES } from '@/repository/channels.fixtures'

mock.module('@/repository/client/carina', {
  namedExports: {
    carinaClient: () => ({ GET: async () => ({}) }),
    revalidatingCarinaClient: () => ({ GET: async () => ({}) }),
  },
})

const { AERIAL_PROGRAM_FIXTURES, PROGRAM_DETAIL_FIXTURES, PROGRAM_FIXTURES } =
  await import('@/repository/programs.fixtures')

const SEARCHED = [
  'app',
  'components',
  'hooks',
  'lib',
  'repository',
  'stories',
  'types',
]

const GENERATED = 'repository/client'

const NOT_SOURCE = new Set(['node_modules'])

const HOLDS_A_CHANNEL = new Set(['channelId', 'whole'])

const A_CHANNEL_ALSO_SAYS = ['no', 'kind']

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

function readBack(id: string): string[] {
  return searchConditionOfQuery(new URLSearchParams({ channel: id }).toString())
    .channels
}

async function sourceFiles(dir: string): Promise<string[]> {
  const found: string[] = []

  for (const entry of await readdir(path.join(ROOT, dir), {
    withFileTypes: true,
  })) {
    const relative = path.posix.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (!NOT_SOURCE.has(entry.name) && relative !== GENERATED) {
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

function spelt(name: ts.PropertyName): string {
  return ts.isStringLiteral(name) ? name.text : name.getText()
}

function saysItIsAChannel(node: ts.Node): boolean {
  return (
    ts.isObjectLiteralExpression(node) &&
    A_CHANNEL_ALSO_SAYS.every((asked) =>
      node.properties.some(
        (one) => ts.isPropertyAssignment(one) && spelt(one.name) === asked,
      ),
    )
  )
}

function channelsWrittenIn(source: ts.SourceFile): string[] {
  const written: string[] = []

  const walk = (node: ts.Node): void => {
    if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.initializer)) {
      const name = spelt(node.name)

      if (
        HOLDS_A_CHANNEL.has(name) ||
        (name === 'id' && saysItIsAChannel(node.parent))
      ) {
        written.push(node.initializer.text)
      }
    }

    ts.forEachChild(node, walk)
  }

  walk(source)

  return written
}

test('a channel written anywhere in the tree is named the way the API names one', async () => {
  const unreadable: string[] = []

  for (const dir of SEARCHED) {
    for (const file of await sourceFiles(dir)) {
      const source = ts.createSourceFile(
        file,
        await readFile(path.join(ROOT, file), 'utf8'),
        ts.ScriptTarget.Latest,
        true,
      )

      for (const id of channelsWrittenIn(source)) {
        if (readBack(id).join(',') !== id) {
          unreadable.push(`${file}: ${id}`)
        }
      }
    }
  }

  assert.deepEqual(unreadable, [])
})

test('every channel in the samples answers to the identifier it is filed under', () => {
  for (const channel of AERIAL_CHANNEL_FIXTURES) {
    assert.deepEqual(readBack(channel.id), [channel.id], channel.name)

    if (channel.whole !== undefined) {
      assert.equal(
        AERIAL_CHANNEL_FIXTURES.some((one) => one.id === channel.whole),
        true,
        channel.name,
      )
    }
  }
})

test('every programme in the samples sits on a channel a rule can be narrowed to', () => {
  const programmes = [
    ...PROGRAM_FIXTURES,
    ...AERIAL_PROGRAM_FIXTURES,
    ...Object.values(PROGRAM_DETAIL_FIXTURES).map((detail) => detail.program),
  ]

  for (const programme of programmes) {
    assert.deepEqual(
      readBack(programme.channelId),
      [programme.channelId],
      programme.title,
    )
  }
})
