import assert from 'node:assert/strict'
import { test } from 'node:test'

import { withIntegerDivision } from '@/lib/bml/integers'

function valueOf(code: string, given: Record<string, unknown> = {}): unknown {
  const names = Object.keys(given)

  return new Function(...names, withIntegerDivision(code))(
    ...names.map((name) => given[name]),
  )
}

test('a quotient is the integer a receiver gives, cut toward zero', () => {
  assert.equal(valueOf('return 28 * (1 / 2) + 90'), 90)
  assert.equal(valueOf('return 28 * (3 / 2) + 90'), 118)
  assert.equal(valueOf('return -7 / 2'), -3)
  assert.equal(valueOf('return 7 / -2'), -3)
  assert.equal(valueOf('return 6 / 3'), 2)
  assert.equal(valueOf('return (a + b) / 2', { a: 1, b: 2 }), 1)
  assert.equal(valueOf('return 2 * a / b', { a: 5, b: 4 }), 2)
  assert.equal(valueOf('return 100 / 7 / 2'), 7)
  assert.equal(valueOf('return 100 / (7 / 2)'), 33)
  assert.equal(valueOf('return "15" / 2'), 7)
})

test('a page counted from a cursor stays on its page until the cursor leaves it', () => {
  assert.equal(
    valueOf('var csr = 13, pre = csr / 10; csr = 14; return csr / 10 != pre'),
    false,
  )
})

test('dividing in place keeps the integer, and reads the place the way it writes it', () => {
  assert.equal(valueOf('var x = 7; x /= 2; return x'), 3)
  assert.equal(valueOf('var o = { p: 9 }; o.p /= 4; return o.p'), 2)
  assert.equal(valueOf('var x = 9; x /= 1 + 1; return x'), 4)
  assert.deepEqual(
    valueOf('var a = [8, 9]; var i = 3; a[i / 2] /= 2; return a'),
    [8, 4],
  )
  assert.equal(valueOf('var x = 20, y; y = (x /= 3) / 2; return y'), 3)
})

test('dividing by zero answers what the language does', () => {
  assert.equal(valueOf('return 1 / 0'), Infinity)
  assert.ok(Number.isNaN(valueOf('return 0 / 0')))
})

test('a regular expression, a string and a comment are not division', () => {
  const code =
    'var s = "a/b/c".replace(/\\//g, "-"); // 1/2\n/* 3/4 */ return s + "/"'

  assert.equal(withIntegerDivision(code), code)
  assert.equal(valueOf(code), 'a-b-c/')
})

test('code without a division, and code that does not parse, are left as they are', () => {
  const plain = 'var a = 1;\nfunction f() { return a * 2 % 3 }'
  const broken = 'var a = 1 / ;'

  assert.equal(withIntegerDivision(plain), plain)
  assert.equal(withIntegerDivision(broken), broken)
})

test('older forms a document may be written in still parse', () => {
  const code =
    'var r; <!-- hidden\nvar o = { p: 5 }; with (o) { r = p / 2 }\n--> end\nreturn r'

  assert.equal(valueOf(code), 2)
})
