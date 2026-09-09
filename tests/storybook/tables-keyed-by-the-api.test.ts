import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'

const WALKED = ['app', 'components', 'hooks', 'lib', 'repository']

const GENERATED = 'repository/client/schema.ts'

const NOT_SOURCE = new Set(['node_modules'])

const READ_STRAIGHT_ON_PURPOSE: {
  file: string
  table: string
  because: string
}[] = [
  {
    file: 'components/channels/add-candidate-dialog.tsx',
    table: 'CHANNEL_RANGE',
    because:
      'the key is what the screen let the reader pick out of the list it drew, ' +
      'never a value that arrived from the API',
  },
  {
    file: 'lib/live-startup.ts',
    table: 'WAITS_FOR',
    because:
      'the key comes from the very list of segments the key type is made of',
  },
  {
    file: 'repository/scan-systems.ts',
    table: 'SYSTEM_LABEL',
    because: 'the key is one this table was asked to enumerate for itself',
  },
]

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

async function theWalkedTree(): Promise<string[]> {
  const files: string[] = []

  for (const dir of WALKED) {
    files.push(...(await sourceFiles(dir)))
  }

  return files.filter((file) => file !== GENERATED)
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

function enumsTheApiOwns(generated: ts.SourceFile): Map<string, string> {
  const owned = new Map<string, string>()

  walk(generated, (node) => {
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

interface Straight {
  where: string
  table: string
  owner: string
}

interface Reading {
  files: string[]
  owned: number
  tables: string[]
  straight: Straight[]
}

function readTheTree(files: string[]): Reading {
  const config = ts.parseJsonConfigFileContent(
    ts.readConfigFile(path.join(ROOT, 'tsconfig.json'), ts.sys.readFile).config,
    ts.sys,
    ROOT,
  )

  const program = ts.createProgram({
    rootNames: [...files, GENERATED].map((file) => path.join(ROOT, file)),
    options: { ...config.options, incremental: false, noEmit: true },
  })

  const checker = program.getTypeChecker()
  const generated = program.getSourceFile(path.join(ROOT, GENERATED))

  if (generated === undefined) {
    throw new Error(`${GENERATED} is not in the tree this test reads`)
  }

  const owned = enumsTheApiOwns(generated)

  function valuesOf(type: ts.Type): string[] | undefined {
    const parts = type.isUnion() ? type.types : [type]
    const said: string[] = []

    for (const part of parts) {
      if (!part.isStringLiteral()) {
        return undefined
      }

      said.push(part.value)
    }

    return said.length > 1 ? said : undefined
  }

  function isGenerated(node: ts.Node): boolean {
    return node.getSourceFile().fileName.endsWith(GENERATED)
  }

  function builtOutOfTheGenerated(from: readonly ts.Node[]): boolean {
    const seen = new Set<ts.Node>()
    const waiting = [...from]

    while (waiting.length > 0) {
      const here = waiting.pop()

      if (here === undefined || seen.has(here)) {
        continue
      }

      seen.add(here)

      if (isGenerated(here)) {
        return true
      }

      let reached = false

      walk(here, (node) => {
        if (!ts.isIdentifier(node)) {
          return
        }

        let symbol = checker.getSymbolAtLocation(node)

        if (symbol === undefined) {
          return
        }

        if (symbol.flags & ts.SymbolFlags.Alias) {
          symbol = checker.getAliasedSymbol(symbol)
        }

        for (const declaration of symbol.declarations ?? []) {
          if (isGenerated(declaration)) {
            reached = true
            continue
          }

          if (
            ts.isTypeAliasDeclaration(declaration) ||
            ts.isInterfaceDeclaration(declaration)
          ) {
            waiting.push(declaration)
          }
        }
      })

      if (reached) {
        return true
      }
    }

    return false
  }

  function keyOfRecord(type: ts.Type): ts.Type | undefined {
    return type.aliasSymbol?.name === 'Record'
      ? type.aliasTypeArguments?.[0]
      : undefined
  }

  function ownerOf(
    key: ts.Type,
    spelt: readonly ts.Node[],
  ): string | undefined {
    const values = valuesOf(key)

    if (values === undefined) {
      return undefined
    }

    const named = owned.get(signature(values))

    if (named !== undefined) {
      return named
    }

    const roots = [...spelt, ...(key.aliasSymbol?.declarations ?? [])]

    return builtOutOfTheGenerated(roots) ? checker.typeToString(key) : undefined
  }

  function keyAsSpelt(expression: ts.Expression): ts.Node[] {
    const symbol = checker.getSymbolAtLocation(expression)
    const spelt: ts.Node[] = []

    for (const declaration of symbol?.declarations ?? []) {
      if (
        !ts.isVariableDeclaration(declaration) ||
        declaration.type === undefined
      ) {
        continue
      }

      const type = declaration.type

      if (ts.isTypeReferenceNode(type) && type.typeArguments !== undefined) {
        spelt.push(type.typeArguments[0])
      }
    }

    return spelt
  }

  const tables = new Set<string>()
  const straight: Straight[] = []

  for (const file of files) {
    const source = program.getSourceFile(path.join(ROOT, file))

    if (source === undefined) {
      throw new Error(`${file} is not in the tree this test reads`)
    }

    walk(source, (node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        const key = keyOfRecord(checker.getTypeAtLocation(node.name))
        const owner =
          key === undefined
            ? undefined
            : ownerOf(key, node.type === undefined ? [] : [node.type])

        if (owner !== undefined) {
          tables.add(`${file}: ${node.name.text}`)
        }
      }

      if (!ts.isElementAccessExpression(node)) {
        return
      }

      const key = keyOfRecord(checker.getTypeAtLocation(node.expression))

      if (key === undefined) {
        return
      }

      const owner = ownerOf(key, keyAsSpelt(node.expression))

      if (owner === undefined) {
        return
      }

      const { line } = source.getLineAndCharacterOfPosition(node.getStart())

      straight.push({
        where: `${file}:${line + 1}`,
        table: node.expression.getText(),
        owner,
      })
    })
  }

  return {
    files,
    owned: owned.size,
    tables: [...tables].sort(),
    straight,
  }
}

let reading: Promise<Reading> | undefined

function theReading(): Promise<Reading> {
  reading ??= theWalkedTree().then(readTheTree)

  return reading
}

function exempt({ where, table }: Straight): boolean {
  const file = where.slice(0, where.lastIndexOf(':'))

  return READ_STRAIGHT_ON_PURPOSE.some(
    (one) => one.file === file && one.table === table,
  )
}

test('a table keyed by an enum the API owns is never read straight', async () => {
  const { files, straight } = await theReading()

  assert.ok(
    files.length > 100,
    `only ${files.length} source files were walked, so this test is reading the wrong tree`,
  )

  assert.deepEqual(
    straight
      .filter((one) => !exempt(one))
      .map((one) => `${one.where}: ${one.table}[…] keyed by ${one.owner}`)
      .sort(),
    [],
    'A table whose keys are an enum the API owns is being read with [], so a ' +
      'value added on the API side and deployed before this bundle gives ' +
      'undefined, and the screen falls over on the next property. Read it ' +
      'with wordFor / shapeFor from @/lib/not-yet-in-this-build instead. A ' +
      'read whose key can only ever come from this bundle belongs in ' +
      'READ_STRAIGHT_ON_PURPOSE, with the reason spelt out.',
  )
})

test('the tree still holds tables and enums this test can recognise', async () => {
  const { owned, tables } = await theReading()

  assert.ok(
    owned > 20,
    `only ${owned} enums were read out of the generated client, so this test ` +
      'recognises almost nothing and would pass over a table that is wide open',
  )

  assert.ok(
    tables.length > 30,
    `only ${tables.length} tables keyed by an enum the API owns were found in ` +
      'the tree, so this test is resolving almost no keys and would pass over ' +
      'a table that is wide open',
  )
})

test('every read this test lets through is still a read it would otherwise catch', async () => {
  const { straight } = await theReading()

  assert.deepEqual(
    READ_STRAIGHT_ON_PURPOSE.filter(
      (one) =>
        !straight.some(
          ({ where, table }) =>
            where.startsWith(`${one.file}:`) && table === one.table,
        ),
    ).map((one) => `${one.file}: ${one.table}[…] — ${one.because}`),
    [],
    'A read named here is no longer a straight read of a table keyed by an ' +
      'enum the API owns, so the exception stands for nothing and would go on ' +
      'letting through whatever later takes that name. Take it off the list.',
  )
})
