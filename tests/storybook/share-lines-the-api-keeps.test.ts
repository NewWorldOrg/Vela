import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'

const WALKED = ['components', 'lib', 'repository']

const GENERATED = 'repository/client'

const NOT_SOURCE = new Set(['node_modules'])

const SPEAKS_OF_A_SHARE = /scrambl|drop|lost|share|watchable/i

const COMPARING = new Set([
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.LessThanEqualsToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.GreaterThanEqualsToken,
])

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

function walk(node: ts.Node, seen: (node: ts.Node) => void): void {
  seen(node)
  ts.forEachChild(node, (child) => walk(child, seen))
}

function fraction(node: ts.Node): number | undefined {
  if (!ts.isNumericLiteral(node)) {
    return undefined
  }

  const value = Number(node.text.replaceAll('_', ''))

  return value > 0 && value < 1 ? value : undefined
}

function nameOf(node: ts.Node): string | undefined {
  if (
    (ts.isVariableDeclaration(node) || ts.isPropertyAssignment(node)) &&
    (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
  ) {
    return node.name.text
  }

  return undefined
}

export function sharesLinedUpIn(file: string, text: string): string[] {
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const fractional = new Set<string>()
  const found: string[] = []

  const at = (node: ts.Node) =>
    `${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`

  walk(source, (node) => {
    const name = nameOf(node)
    const initial =
      ts.isVariableDeclaration(node) || ts.isPropertyAssignment(node)
        ? node.initializer
        : undefined

    if (name === undefined || initial === undefined) {
      return
    }

    if (fraction(initial) === undefined) {
      return
    }

    fractional.add(name)

    if (SPEAKS_OF_A_SHARE.test(name)) {
      found.push(`${at(node)}: ${name} = ${initial.getText()}`)
    }
  })

  const aFraction = (node: ts.Expression) =>
    fraction(node) !== undefined ||
    (ts.isIdentifier(node) && fractional.has(node.text))

  walk(source, (node) => {
    if (
      !ts.isBinaryExpression(node) ||
      !COMPARING.has(node.operatorToken.kind)
    ) {
      return
    }

    const [line, other] = aFraction(node.right)
      ? [node.right, node.left]
      : [node.left, node.right]

    if (aFraction(line) && SPEAKS_OF_A_SHARE.test(other.getText())) {
      found.push(`${at(node)}: ${node.getText()}`)
    }
  })

  return [...new Set(found)].sort()
}

test('no fixed share of scrambled or dropped packets is held by the screen', async () => {
  const files: string[] = []

  for (const dir of WALKED) {
    files.push(...(await sourceFiles(dir)))
  }

  assert.ok(
    files.length > 100,
    `only ${files.length} source files were walked, so this test is reading the wrong tree`,
  )

  const found: string[] = []

  for (const file of files) {
    found.push(
      ...sharesLinedUpIn(file, await readFile(path.join(ROOT, file), 'utf8')),
    )
  }

  assert.deepEqual(
    found,
    [],
    'A fraction is standing in for how much scrambling or dropping a ' +
      'recording can take. Where that line sits is a quality threshold the ' +
      'API keeps and the reader can move, and the API answers each recording ' +
      'with the level it graded it at. Read that level instead of holding a ' +
      'second line here that the threshold dialog cannot reach.',
  )
})

test('the reading recognises the shapes a fixed share has taken', () => {
  assert.deepEqual(
    sharesLinedUpIn(
      'named.ts',
      [
        'const SCRAMBLED_BEYOND_WATCHING = 0.01',
        'export const f = (r: { scrambledShare?: number }) =>',
        '  (r.scrambledShare ?? 0) >= SCRAMBLED_BEYOND_WATCHING',
      ].join('\n'),
    ),
    [
      'named.ts:1: SCRAMBLED_BEYOND_WATCHING = 0.01',
      'named.ts:3: (r.scrambledShare ?? 0) >= SCRAMBLED_BEYOND_WATCHING',
    ],
  )

  assert.deepEqual(
    sharesLinedUpIn(
      'inline.tsx',
      'export const f = (droppedShare: number) => droppedShare > 0.001',
    ),
    ['inline.tsx:1: droppedShare > 0.001'],
  )

  assert.deepEqual(
    sharesLinedUpIn(
      'neutral.ts',
      [
        'const LINE = 0.005',
        'export const f = (lost: number) => LINE < lost',
      ].join('\n'),
    ),
    ['neutral.ts:2: LINE < lost'],
  )

  assert.deepEqual(
    sharesLinedUpIn(
      'unrelated.ts',
      [
        'export const PART_SECONDS = 0.05',
        'const THRESHOLD = { scale: 0.01 }',
        'export const f = (behind: number) => behind > 0.5',
      ].join('\n'),
    ),
    [],
  )
})
