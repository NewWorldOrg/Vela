import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Linter } from 'eslint'

import vela from '@/scripts/eslint-rules.mjs'

const RULE = 'vela/max-ternary-chain'

function said(code: string, max?: number): string[] {
  const linter = new Linter({ configType: 'flat' })

  return linter
    .verify(code, [
      {
        plugins: { vela },
        languageOptions: {
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        rules: { [RULE]: max === undefined ? 'error' : ['error', { max }] },
      },
    ])
    .filter((one) => one.ruleId === RULE)
    .map((one) => `${one.line}: ${one.message}`)
}

test('one ternary, and two chained into one expression, pass', () => {
  assert.deepEqual(said('const x = a ? 1 : 2'), [])
  assert.deepEqual(said('const x = a ? 1 : b ? 2 : 3'), [])
  assert.deepEqual(said('const x = a ? (b ? 1 : 2) : 3'), [])
  assert.deepEqual(said('const x = (a ? b : c) ? 1 : 2'), [])
})

test('three chained down the else side are stopped, and the count is said', () => {
  const found = said('const x = a ? 1 : b ? 2 : c ? 3 : 4')

  assert.equal(found.length, 1)
  assert.match(found[0], /^1: 3 ternaries are chained into one expression/)
  assert.match(found[0], /2 is the most one may hold/)
})

test('a chain is counted across both branches and the test, not only down one side', () => {
  assert.match(
    said('const x = a ? (b ? 1 : 2) : c ? 3 : 4')[0],
    /^1: 3 ternaries/,
    'the two-axis shape — a ternary in each branch of a third — is three',
  )
  assert.match(
    said('const x = (a ? b : c) ? (d ? 1 : 2) : e ? 3 : f ? 4 : 5')[0],
    /^1: 5 ternaries/,
  )
})

test('a chain is said once, where it starts', () => {
  const found = said(
    ['const x =', '  a ? 1', '  : b ? 2', '  : c ? 3', '  : 4'].join('\n'),
  )

  assert.equal(found.length, 1)
  assert.match(found[0], /^2: /)
})

test('ternaries that only sit near each other are counted apart', () => {
  assert.deepEqual(
    said('const x = a ? [b ? 1 : 2] : { k: c ? 3 : 4 }'),
    [],
    'a ternary inside an array or an object is not a branch of the one around it',
  )
  assert.deepEqual(said('const x = a ? f(b ? 1 : c ? 2 : 3) : 4'), [])
  assert.deepEqual(
    said('const x = a ? <p>{b ? 1 : c ? 2 : 3}</p> : d ? <i /> : <b />'),
    [],
    'a ternary among the children of an element starts a chain of its own',
  )
  assert.deepEqual(
    said('const x = a ? 1 : () => (b ? 2 : c ? 3 : 4)'),
    [],
    'a ternary inside a function is not part of the expression that holds the function',
  )
})

test('the most a chain may hold can be set', () => {
  assert.equal(said('const x = a ? 1 : b ? 2 : 3', 1).length, 1)
  assert.deepEqual(said('const x = a ? 1 : b ? 2 : c ? 3 : 4', 3), [])
})

test('a longer chain is let through only by a line that says why', () => {
  const chain = 'const x = a ? 1 : b ? 2 : c ? 3 : 4'

  assert.deepEqual(
    said(
      `// eslint-disable-next-line ${RULE} -- the three steps are one sentence\n${chain}`,
    ),
    [],
  )

  const unexplained = said(`// eslint-disable-next-line ${RULE}\n${chain}`)

  assert.equal(unexplained.length, 1)
  assert.match(unexplained[0], /^1: .*without saying why/)

  const emptyReason = said(`// eslint-disable-next-line ${RULE} --  \n${chain}`)

  assert.equal(emptyReason.length, 1)
  assert.match(emptyReason[0], /without saying why/)
})

test('a line that lets another rule through is not asked for a reason by this one', () => {
  assert.deepEqual(
    said('// eslint-disable-next-line no-console\nconst x = a ? 1 : 2'),
    [],
  )
})
