import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

const NOT_SOURCE = new Set([
  '.git',
  '.next',
  'node_modules',
  'storybook-static',
])

const SERVER_ENTRY = /^(page|layout|template|not-found|default)\.tsx?$/

const A_COMPONENT = /^[A-Z][a-z0-9][A-Za-z0-9]*$/

function filesUnder(dir: string): string[] {
  const found: string[] = []

  for (const entry of readdirSync(path.join(ROOT, dir), {
    withFileTypes: true,
  })) {
    const relative = path.posix.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (!NOT_SOURCE.has(entry.name)) {
        found.push(...filesUnder(relative))
      }
      continue
    }

    if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      found.push(relative)
    }
  }

  return found
}

function parsed(file: string): ts.SourceFile {
  return ts.createSourceFile(
    file,
    readFileSync(path.join(ROOT, file), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
}

function isClient(source: ts.SourceFile): boolean {
  const first = source.statements[0]

  return (
    first !== undefined &&
    ts.isExpressionStatement(first) &&
    ts.isStringLiteral(first.expression) &&
    first.expression.text === 'use client'
  )
}

function resolved(from: string, specifier: string): string | undefined {
  const asked = specifier.startsWith('@/')
    ? specifier.slice(2)
    : specifier.startsWith('.')
      ? path.posix.join(path.posix.dirname(from), specifier)
      : undefined

  if (asked === undefined) {
    return undefined
  }

  return [
    `${asked}.tsx`,
    `${asked}.ts`,
    `${asked}/index.tsx`,
    `${asked}/index.ts`,
    asked,
  ].find(
    (candidate) =>
      /\.tsx?$/.test(candidate) && existsSync(path.join(ROOT, candidate)),
  )
}

type Taken = { from: string; names: string[]; whole: boolean }

function valueNames(
  elements: readonly (ts.ImportSpecifier | ts.ExportSpecifier)[],
): string[] {
  return elements
    .filter((element) => !element.isTypeOnly)
    .map((element) => (element.propertyName ?? element.name).text)
}

function takenByImport(
  statement: ts.ImportDeclaration,
): Omit<Taken, 'from'> | undefined {
  const clause = statement.importClause

  if (clause === undefined) {
    return { names: [], whole: false }
  }

  if (clause.isTypeOnly) {
    return undefined
  }

  const named = clause.name ? [clause.name.text] : []
  const bindings = clause.namedBindings

  if (bindings === undefined) {
    return { names: named, whole: false }
  }

  return ts.isNamespaceImport(bindings)
    ? { names: named, whole: true }
    : {
        names: [...named, ...valueNames(bindings.elements)],
        whole: false,
      }
}

function takenByExport(
  statement: ts.ExportDeclaration,
): Omit<Taken, 'from'> | undefined {
  if (statement.isTypeOnly) {
    return undefined
  }

  const clause = statement.exportClause

  if (clause === undefined || !ts.isNamedExports(clause)) {
    return { names: [], whole: true }
  }

  return {
    names: valueNames(clause.elements),
    whole: false,
  }
}

function valuesTaken(file: string, source: ts.SourceFile): Taken[] {
  return source.statements.flatMap((statement) => {
    const specifier =
      ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)
        ? statement.moduleSpecifier
        : undefined
    const from =
      specifier !== undefined && ts.isStringLiteral(specifier)
        ? resolved(file, specifier.text)
        : undefined

    if (from === undefined) {
      return []
    }

    const taken = ts.isImportDeclaration(statement)
      ? takenByImport(statement)
      : takenByExport(statement as ts.ExportDeclaration)

    return taken === undefined ? [] : [{ from, ...taken }]
  })
}

function serverModules(): Map<string, Taken[]> {
  const sources = new Map<string, ts.SourceFile>()
  const read = (file: string) => {
    const known = sources.get(file)

    if (known !== undefined) {
      return known
    }

    const source = parsed(file)
    sources.set(file, source)

    return source
  }

  const waiting = filesUnder('app').filter(
    (file) =>
      SERVER_ENTRY.test(path.posix.basename(file)) && !isClient(read(file)),
  )
  const reached = new Map<string, Taken[]>()

  while (waiting.length > 0) {
    const file = waiting.pop() as string

    if (reached.has(file)) {
      continue
    }

    const taken = valuesTaken(file, read(file))
    reached.set(file, taken)

    for (const { from } of taken) {
      if (!reached.has(from) && !isClient(read(from))) {
        waiting.push(from)
      }
    }
  }

  return new Map(
    [...reached].map(([file, taken]) => [
      file,
      taken.filter(({ from }) => isClient(read(from))),
    ]),
  )
}

test('the server reaches the screens that draw their rows as cards', () => {
  const reached = serverModules()

  for (const file of [
    'components/channels/channels-page.tsx',
    'components/tuners/tuners-page.tsx',
    'components/quality/quality-page.tsx',
    'components/authentication/session-table.tsx',
    'components/migration/migration-report.tsx',
  ]) {
    assert.ok(reached.has(file), `${file} is not drawn on the server`)
  }
})

test('a part drawn on the server takes only components from a client module', () => {
  const wrong = [...serverModules()].flatMap(([file, taken]) =>
    taken.flatMap(({ from, names, whole }) => [
      ...(whole ? [`${file} takes all of ${from}`] : []),
      ...names
        .filter((name) => !A_COMPONENT.test(name))
        .map((name) => `${file} takes ${name} from ${from}`),
    ]),
  )

  assert.deepEqual(wrong, [])
})
