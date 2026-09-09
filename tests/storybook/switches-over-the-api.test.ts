import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'

const WALKED = ['app', 'components', 'hooks', 'lib', 'repository']

const GENERATED = 'repository/client/schema.ts'

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

async function parsed(file: string): Promise<ts.SourceFile> {
  return ts.createSourceFile(
    file,
    await readFile(path.join(ROOT, file), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
}

function walk(node: ts.Node, seen: (node: ts.Node) => void): void {
  seen(node)
  ts.forEachChild(node, (child) => walk(child, seen))
}

function signature(names: string[]): string {
  return [...names].sort().join('|')
}

function stringsOfUnion(type: ts.TypeNode): string[] | undefined {
  const members = ts.isUnionTypeNode(type) ? type.types : [type]
  const said: string[] = []

  for (const member of members) {
    if (member.kind === ts.SyntaxKind.NullKeyword) {
      continue
    }

    if (!ts.isLiteralTypeNode(member) || !ts.isStringLiteral(member.literal)) {
      return undefined
    }

    said.push(member.literal.text)
  }

  return said.length > 1 ? said : undefined
}

async function enumsTheApiOwns(): Promise<Map<string, string>> {
  const owned = new Map<string, string>()

  walk(await parsed(GENERATED), (node) => {
    const named =
      ts.isTypeAliasDeclaration(node) || ts.isPropertySignature(node)
        ? node
        : undefined

    if (named?.type === undefined || named.name === undefined) {
      return
    }

    const values = stringsOfUnion(named.type)

    if (values !== undefined) {
      owned.set(signature(values), named.name.getText())
    }
  })

  return owned
}

interface Switched {
  where: string
  values: string[]
}

function switchesWithoutDefault(source: ts.SourceFile): Switched[] {
  const found: Switched[] = []

  walk(source, (node) => {
    if (!ts.isSwitchStatement(node)) {
      return
    }

    const clauses = node.caseBlock.clauses

    if (clauses.some((clause) => ts.isDefaultClause(clause))) {
      return
    }

    const values: string[] = []

    for (const clause of clauses) {
      if (!ts.isCaseClause(clause) || !ts.isStringLiteral(clause.expression)) {
        return
      }

      values.push(clause.expression.text)
    }

    const { line } = source.getLineAndCharacterOfPosition(node.getStart())

    found.push({ where: `${source.fileName}:${line + 1}`, values })
  })

  return found
}

async function theWalkedTree(): Promise<string[]> {
  const files: string[] = []

  for (const dir of WALKED) {
    files.push(...(await sourceFiles(dir)))
  }

  return files.filter((file) => file !== GENERATED)
}

test('a switch over an enum the API owns always says what to do with the rest', async () => {
  const owned = await enumsTheApiOwns()
  const files = await theWalkedTree()

  assert.ok(
    files.length > 100,
    `only ${files.length} source files were walked, so this test is reading the wrong tree`,
  )

  const uncovered: string[] = []

  for (const file of files) {
    for (const { where, values } of switchesWithoutDefault(
      await parsed(file),
    )) {
      const owner = owned.get(signature(values))

      if (owner !== undefined) {
        uncovered.push(`${where}: ${owner}`)
      }
    }
  }

  assert.deepEqual(
    uncovered.sort(),
    [],
    'A switch covers every value of an enum the API owns and has no default, ' +
      'so a value added on the API side and deployed before this bundle falls ' +
      'through every case and comes back undefined, and the screen falls over ' +
      'on what it renders. Give it a default that names the alternative from ' +
      '@/lib/not-yet-in-this-build. A union this repository owns needs no ' +
      'default: the exhaustiveness check is what guards it, and a default ' +
      'would take that away.',
  )
})

test('the generated client still holds enums this test can recognise', async () => {
  const owned = await enumsTheApiOwns()

  assert.ok(
    owned.size > 20,
    `only ${owned.size} enums were read out of the generated client, so this ` +
      'test recognises almost nothing and would pass over a switch that is ' +
      'wide open',
  )
})
