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

type Taken = { module: string; names: string[]; whole: boolean }

function valuesTaken(file: string, source: ts.SourceFile): Taken[] {
  const taken: Taken[] = []

  for (const statement of source.statements) {
    if (
      (ts.isImportDeclaration(statement) ||
        ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier !== undefined &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      const module = resolved(file, statement.moduleSpecifier.text)

      if (module === undefined) {
        continue
      }

      if (ts.isImportDeclaration(statement)) {
        const clause = statement.importClause

        if (clause === undefined) {
          taken.push({ module, names: [], whole: false })
          continue
        }

        if (clause.isTypeOnly) {
          continue
        }

        const names: string[] = clause.name ? [clause.name.text] : []
        const bindings = clause.namedBindings

        if (bindings !== undefined && ts.isNamespaceImport(bindings)) {
          taken.push({ module, names, whole: true })
          continue
        }

        for (const element of bindings?.elements ?? []) {
          if (!element.isTypeOnly) {
            names.push((element.propertyName ?? element.name).text)
          }
        }

        taken.push({ module, names, whole: false })
        continue
      }

      if (statement.isTypeOnly) {
        continue
      }

      const clause = statement.exportClause

      taken.push({
        module,
        names:
          clause !== undefined && ts.isNamedExports(clause)
            ? clause.elements
                .filter((element) => !element.isTypeOnly)
                .map((element) => (element.propertyName ?? element.name).text)
            : [],
        whole: clause === undefined || !ts.isNamedExports(clause),
      })
    }
  }

  return taken
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

    for (const { module } of taken) {
      if (!reached.has(module) && !isClient(read(module))) {
        waiting.push(module)
      }
    }
  }

  return new Map(
    [...reached].map(([file, taken]) => [
      file,
      taken.filter(({ module }) => isClient(read(module))),
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
    taken.flatMap(({ module, names, whole }) => [
      ...(whole ? [`${file} takes all of ${module}`] : []),
      ...names
        .filter((name) => !A_COMPONENT.test(name))
        .map((name) => `${file} takes ${name} from ${module}`),
    ]),
  )

  assert.deepEqual(wrong, [])
})
