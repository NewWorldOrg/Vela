import assert from 'node:assert/strict'
import { test } from 'node:test'

import { dateOnAir } from '@/lib/bml/clock'

const ON_AIR = Date.parse('2026-01-01T00:00:12.750Z')

test('the current time a date without arguments, Date() and Date.now() read is the time on air, read again at each call', () => {
  let now = ON_AIR
  const OnAir = dateOnAir(Date, () => now)

  assert.equal(new OnAir().getTime(), ON_AIR)
  assert.equal(OnAir.now(), ON_AIR)
  assert.equal(OnAir(), new Date(ON_AIR).toString())

  now = ON_AIR - 9_500

  assert.equal(new OnAir().getTime(), ON_AIR - 9_500)
  assert.equal(OnAir.now(), ON_AIR - 9_500)
})

test('a date made from given arguments, a parse and a UTC time are made as before, and every date is one to it and it to every date', () => {
  const OnAir = dateOnAir(Date, () => ON_AIR)
  const given = new OnAir(2001, 0, 2, 3, 4, 5)

  assert.equal(given.getTime(), new Date(2001, 0, 2, 3, 4, 5).getTime())
  assert.equal(new OnAir(0).getTime(), 0)
  assert.equal(
    new OnAir('2001-01-02T03:04:05Z').getTime(),
    Date.UTC(2001, 0, 2, 3, 4, 5),
  )
  assert.equal(
    OnAir.parse('2001-01-02T03:04:05Z'),
    Date.UTC(2001, 0, 2, 3, 4, 5),
  )
  assert.equal(OnAir.UTC(2001, 0, 2), Date.UTC(2001, 0, 2))
  assert.equal(OnAir.prototype, Date.prototype)
  assert.ok(new Date(0) instanceof OnAir)
  assert.ok(new OnAir() instanceof Date)
  assert.ok(Object.getPrototypeOf(new OnAir()) === Date.prototype)
})

test('a date of a class a document makes from it reads the time on air too', () => {
  const OnAir = dateOnAir(Date, () => ON_AIR)

  class Later extends OnAir {
    later(): number {
      return this.getTime() + 1000
    }
  }

  const made = new Later()

  assert.ok(made instanceof Later)
  assert.equal(made.later(), ON_AIR + 1000)
})
