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

test('dividing in place works out a place that changes something only once', () => {
  assert.deepEqual(
    valueOf('var a = [8, 9, 10]; var i = 1; a[i++] /= 2; return [a, i]'),
    [[8, 4, 10], 2],
  )
  assert.deepEqual(
    valueOf('var a = [5, 6, 7]; var b = 4; a[b /= 2] /= 3; return [a, b]'),
    [[5, 6, 2], 2],
  )
  assert.deepEqual(
    valueOf(
      'var o = { x: 9 }, calls = 0; function f() { calls++; return o } f().x /= 2; return [o.x, calls]',
    ),
    [4, 1],
  )
  assert.deepEqual(
    valueOf(
      'var o = { x: 9 }, calls = 0; function f() { calls++; return o } (f())["x"] /= 2; return [o.x, calls]',
    ),
    [4, 1],
  )
  assert.deepEqual(
    valueOf(
      'var o = { n: 30 }, keys = 0; function k() { keys++; return "n" } var y = o[k()] /= 4; return [o.n, y, keys]',
    ),
    [7, 7, 1],
  )
})

test('dividing in place sees through the brackets around a place', () => {
  assert.deepEqual(
    valueOf(
      'var o = { x: 9 }, calls = 0; function f() { calls++; return o } ((f().x)) /= 2; return [o.x, calls]',
    ),
    [4, 1],
  )
  assert.equal(valueOf('var x = 9; (x) /= 2; return x'), 4)
})

test('a place is read before its divisor is worked out, as the language does', () => {
  assert.deepEqual(
    valueOf(
      'var o = { x: 9 }, calls = 0; function f() { calls++; return o } f().x /= (o.x = 100, 2); return o.x',
    ),
    4,
  )
})

test('a division that follows a word stays apart from it', () => {
  assert.equal(valueOf('var a = 3, b = 4; return(a+b)/2'), 3)
  assert.equal(valueOf('var x = 7; return-x/2'), -3)
  assert.equal(
    valueOf('switch (1) { case(3)/2: return "hit" } return "miss"'),
    'hit',
  )
  assert.equal(valueOf('var o = { 1: true }, b = 2; return 3/(b)in o'), true)
  assert.equal(
    valueOf(
      'var a = [8]; var calls = 0; function f() { calls++; return a } return f()[0]/=3',
    ),
    2,
  )
})

test('a rewrite that cannot be made gives the code back as it was', (t) => {
  const held = Object.getOwnPropertyDescriptor(Array.prototype, 'flatMap')

  t.after(() => {
    if (held) {
      Object.defineProperty(Array.prototype, 'flatMap', held)
    }
  })
  Object.defineProperty(Array.prototype, 'flatMap', {
    configurable: true,
    writable: true,
    value: () => {
      throw new Error('a document wrote this')
    },
  })

  assert.equal(withIntegerDivision('var a = 1 / 2'), 'var a = 1 / 2')
})
