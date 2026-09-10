import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'

const PUBLISHED = ['repository']

const PRODUCTION = ['app', 'components', 'hooks', 'lib', 'repository', 'types']

const GENERATED = 'repository/client'

const NOT_SOURCE = new Set(['node_modules'])

const ONLY_FOR_STORIES = /\.fixtures\.tsx?$/

const NOT_FILLED_ON_PURPOSE: { because: string; fields: string[] }[] = []

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

    if (/\.tsx?$/.test(entry.name) && !ONLY_FOR_STORIES.test(entry.name)) {
      found.push(relative)
    }
  }

  return found
}

async function theTree(dirs: string[]): Promise<string[]> {
  const files: string[] = []

  for (const dir of dirs) {
    files.push(...(await sourceFiles(dir)))
  }

  return files
}

function walk(node: ts.Node, seen: (node: ts.Node) => void): void {
  seen(node)
  ts.forEachChild(node, (child) => walk(child, seen))
}

function spelt(name: ts.PropertyName): string {
  return ts.isStringLiteral(name) ? name.text : name.getText()
}

function membersOf(type: ts.TypeNode): ts.PropertySignature[] {
  return ts.isTypeLiteralNode(type)
    ? type.members.filter(
        (member): member is ts.PropertySignature =>
          ts.isPropertySignature(member) && member.type !== undefined,
      )
    : []
}

interface Filling {
  files: string[]
  published: string[]
  fields: number
  filled: number
  unfilled: string[]
}

const PLACED = new Set([
  ts.SyntaxKind.ObjectLiteralExpression,
  ts.SyntaxKind.ArrayLiteralExpression,
  ts.SyntaxKind.Identifier,
  ts.SyntaxKind.PropertyAccessExpression,
  ts.SyntaxKind.ElementAccessExpression,
  ts.SyntaxKind.CallExpression,
  ts.SyntaxKind.NewExpression,
  ts.SyntaxKind.NonNullExpression,
  ts.SyntaxKind.AsExpression,
  ts.SyntaxKind.SatisfiesExpression,
  ts.SyntaxKind.ParenthesizedExpression,
  ts.SyntaxKind.BinaryExpression,
  ts.SyntaxKind.ConditionalExpression,
  ts.SyntaxKind.AwaitExpression,
])

function readTheTree(published: string[], production: string[]): Filling {
  const config = ts.parseJsonConfigFileContent(
    ts.readConfigFile(path.join(ROOT, 'tsconfig.json'), ts.sys.readFile).config,
    ts.sys,
    ROOT,
  )

  const program = ts.createProgram({
    rootNames: [...new Set([...published, ...production])].map((file) =>
      path.join(ROOT, file),
    ),
    options: { ...config.options, incremental: false, noEmit: true },
  })

  const checker = program.getTypeChecker()

  const boundary = new Set(
    published.map((file) => program.getSourceFile(path.join(ROOT, file))),
  )

  function declaresTheBoundary(node: ts.Node): boolean {
    return boundary.has(node.getSourceFile())
  }

  const declared = new Map<
    string,
    ts.InterfaceDeclaration | ts.TypeAliasDeclaration
  >()
  const exported: string[] = []

  for (const file of published) {
    const source = program.getSourceFile(path.join(ROOT, file))

    if (source === undefined) {
      throw new Error(`${file} is not in the tree this test reads`)
    }

    walk(source, (node) => {
      if (
        !ts.isInterfaceDeclaration(node) &&
        !ts.isTypeAliasDeclaration(node)
      ) {
        return
      }

      declared.set(node.name.text, node)

      if (
        ts
          .getModifiers(node)
          ?.some((one) => one.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        exported.push(node.name.text)
      }
    })
  }

  const filled = new Set<ts.PropertySignature>()

  function mark(declarations: readonly ts.Declaration[] | undefined): void {
    for (const declaration of declarations ?? []) {
      if (
        ts.isPropertySignature(declaration) &&
        declaresTheBoundary(declaration)
      ) {
        filled.add(declaration)
      }
    }
  }

  function markOn(wanted: ts.Type, named: string): void {
    for (const part of wanted.isUnion() ? wanted.types : [wanted]) {
      mark(part.getProperty(named)?.declarations)
    }
  }

  function partsOf(type: ts.Type): readonly ts.Type[] {
    return type.isUnion() ? type.types : [type]
  }

  function whatItHolds(type: ts.Type): readonly ts.Type[] {
    return (type.flags & ts.TypeFlags.Object) !== 0 &&
      ((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) !== 0
      ? checker.getTypeArguments(type as ts.TypeReference)
      : []
  }

  const paired = new Map<ts.Type, Set<ts.Type>>()

  function handOver(wanted: ts.Type, held: ts.Type): void {
    for (const part of partsOf(wanted)) {
      const inside = whatItHolds(part)

      for (const one of partsOf(held)) {
        if (one === part) {
          continue
        }

        const already = paired.get(part) ?? new Set<ts.Type>()

        paired.set(part, already)

        if (already.has(one)) {
          continue
        }

        already.add(one)

        for (const property of one.getProperties()) {
          const target = part.getProperty(property.name)

          if (target === undefined) {
            continue
          }

          mark(target.declarations)
          handOver(
            checker.getTypeOfSymbol(target),
            checker.getTypeOfSymbol(property),
          )
        }

        const from = whatItHolds(one)

        if (from.length === inside.length) {
          inside.forEach((wants, index) => handOver(wants, from[index]))
        }
      }
    }
  }

  function spelling(name: ts.PropertyName | undefined): string | undefined {
    if (name === undefined) {
      return undefined
    }

    return ts.isIdentifier(name) || ts.isStringLiteral(name)
      ? name.text
      : undefined
  }

  function built(node: ts.ObjectLiteralExpression, wanted: ts.Type): void {
    for (const property of node.properties) {
      if (ts.isSpreadAssignment(property)) {
        for (const held of checker
          .getTypeAtLocation(property.expression)
          .getProperties()) {
          markOn(wanted, held.name)
        }
        continue
      }

      const named = spelling(property.name)

      if (named !== undefined) {
        markOn(wanted, named)
      }
    }
  }

  function placed(node: ts.Expression): void {
    if (
      ts.isPropertyAccessExpression(node.parent) &&
      node.parent.name === node
    ) {
      return
    }

    const wanted = checker.getContextualType(node)

    if (wanted === undefined) {
      return
    }

    if (ts.isObjectLiteralExpression(node)) {
      built(node, wanted)
      return
    }

    handOver(wanted, checker.getTypeAtLocation(node))
  }

  for (const file of production) {
    const source = program.getSourceFile(path.join(ROOT, file))

    if (source === undefined) {
      throw new Error(`${file} is not in the tree this test reads`)
    }

    walk(source, (node) => {
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(node.left)
      ) {
        markOn(
          checker.getTypeAtLocation(node.left.expression),
          node.left.name.text,
        )
      }

      if (PLACED.has(node.kind)) {
        placed(node as ts.Expression)
      }
    })
  }

  const named = new Map<ts.PropertySignature, string>()
  const opened = new Set<string>()
  const unfilled = new Set<string>()

  function openType(type: ts.TypeNode, base: string): void {
    if (ts.isUnionTypeNode(type) || ts.isIntersectionTypeNode(type)) {
      for (const member of type.types) {
        openType(member, base)
      }
      return
    }

    if (ts.isArrayTypeNode(type)) {
      openType(type.elementType, base)
      return
    }

    if (ts.isParenthesizedTypeNode(type)) {
      openType(type.type, base)
      return
    }

    if (ts.isTypeReferenceNode(type)) {
      openDeclaration(type.typeName.getText())
      return
    }

    for (const member of membersOf(type)) {
      openMember(member, base)
    }
  }

  function openMember(member: ts.PropertySignature, base: string): void {
    if (member.type === undefined) {
      return
    }

    if (!named.has(member)) {
      named.set(member, `${base}.${spelt(member.name)}`)
    }

    const where = named.get(member) ?? ''

    if (filled.has(member)) {
      openType(member.type, where)
    } else {
      unfilled.add(where)
    }
  }

  function openDeclaration(name: string): void {
    if (opened.has(name)) {
      return
    }

    opened.add(name)

    const declaration = declared.get(name)

    if (declaration === undefined) {
      return
    }

    if (ts.isTypeAliasDeclaration(declaration)) {
      openType(declaration.type, name)
      return
    }

    for (const clause of declaration.heritageClauses ?? []) {
      for (const one of clause.types) {
        openDeclaration(one.expression.getText())
      }
    }

    for (const member of declaration.members) {
      if (ts.isPropertySignature(member) && member.type !== undefined) {
        openMember(member, name)
      }
    }
  }

  for (const name of [...exported].sort()) {
    openDeclaration(name)
  }

  return {
    files: production,
    published: exported.sort(),
    fields: named.size,
    filled: filled.size,
    unfilled: [...unfilled].sort(),
  }
}

let filling: Promise<Filling> | undefined

function theFilling(): Promise<Filling> {
  filling ??= Promise.all([theTree(PUBLISHED), theTree(PRODUCTION)]).then(
    ([published, production]) => readTheTree(published, production),
  )

  return filling
}

function letThrough(): Set<string> {
  return new Set(NOT_FILLED_ON_PURPOSE.flatMap((one) => one.fields))
}

test('a field a screen can draw is filled in somewhere a story is not', async () => {
  const { files, unfilled } = await theFilling()

  assert.ok(
    files.length > 200,
    `only ${files.length} source files were walked, so this test is reading the wrong tree`,
  )

  const missed = letThrough()

  assert.deepEqual(
    unfilled.filter((one) => !missed.has(one)),
    [],
    `A type ${PUBLISHED.join('/')} publishes holds this field and nothing ` +
      'outside a fixture ever puts a value in it, so on the real thing it is ' +
      'always absent: the type says it is there, the build is green, the ' +
      'story fills it in and the screen draws it. Fill it, take what draws ' +
      'it away, or put it in NOT_FILLED_ON_PURPOSE with the reason it stays.',
  )
})

test('the tree still holds types this test can recognise', async () => {
  const { published, fields, filled } = await theFilling()

  assert.ok(
    published.length > 150,
    `only ${published.length} types were found being published by ` +
      `${PUBLISHED.join('/')}, so this test is looking at almost nothing`,
  )

  assert.ok(
    fields > 800,
    `only ${fields} fields were walked out of those types, so this test is ` +
      'reading almost none of what a screen is handed',
  )

  assert.ok(
    filled > 800,
    `only ${filled} fields were seen being filled in, so this test is ` +
      'resolving almost nothing and would call a field unfilled that every ' +
      'screen has had all along',
  )
})

test('every field this test lets through is still one it would otherwise catch', async () => {
  const { unfilled } = await theFilling()

  const held = new Set(unfilled)

  assert.deepEqual(
    NOT_FILLED_ON_PURPOSE.flatMap((one) =>
      one.fields
        .filter((field) => !held.has(field))
        .map((field) => `${field} — ${one.because}`),
    ),
    [],
    'A field named here is filled in after all, or is no longer part of a ' +
      'type this repository publishes, so the exception stands for nothing ' +
      'and would go on letting through whatever later takes that name. Take ' +
      'it off the list.',
  )
})
