import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { test } from 'node:test'

import {
  formatBytes,
  formatClock,
  formatDateTime,
  formatLength,
  formatPlayhead,
  formatMonth,
  formatSpan,
  formatStamp,
} from './format.ts'

/**
 * Zones far enough apart that a formatter reading the machine instead of
 * naming its own lands on a different day, a different hour and a different
 * month for the instants below.
 */
const ZONES = ['Etc/UTC', 'Asia/Tokyo', 'America/New_York', 'Pacific/Auckland']

function underZone(zone: string, check: () => void): void {
  const held = process.env.TZ

  process.env.TZ = zone

  try {
    check()
  } finally {
    if (held === undefined) {
      delete process.env.TZ
    } else {
      process.env.TZ = held
    }
  }
}

/** Runs the same assertions with the process sitting in each zone in turn. */
function inEveryZone(name: string, check: () => void): void {
  for (const zone of ZONES) {
    test(`${name} — TZ=${zone}`, () => {
      underZone(zone, check)
    })
  }
}

inEveryZone('formatDateTime spells a UTC instant in Japan time', () => {
  assert.equal(formatDateTime('2026-08-20T11:50:46Z'), '2026/08/20 20:50')
  assert.equal(
    formatDateTime('2026-08-20T11:50:46.482193Z'),
    '2026/08/20 20:50',
  )
})

inEveryZone('formatDateTime carries an instant over into the next day', () => {
  assert.equal(formatDateTime('2026-08-20T15:00:00Z'), '2026/08/21 00:00')
  assert.equal(formatDateTime('2026-12-31T14:59:00Z'), '2026/12/31 23:59')
  assert.equal(formatDateTime('2026-12-31T15:00:00Z'), '2027/01/01 00:00')
})

inEveryZone('formatDateTime reads the offset an instant carries', () => {
  assert.equal(formatDateTime('2026-08-20T20:50:46+09:00'), '2026/08/20 20:50')
  assert.equal(formatDateTime('2026-08-20T07:50:46-04:00'), '2026/08/20 20:50')
})

inEveryZone('formatStamp drops the year and keeps Japan time', () => {
  assert.equal(formatStamp('2026-08-20T11:50:46Z'), '08/20 20:50')
  assert.equal(formatStamp('2026-01-09T15:00:00Z'), '01/10 00:00')
})

inEveryZone('formatClock spells the hour and minute in Japan time', () => {
  assert.equal(formatClock(Date.parse('2026-08-20T11:50:46Z')), '20:50')
  assert.equal(formatClock(Date.parse('2026-08-20T15:00:00Z')), '00:00')
  assert.equal(formatClock(Date.parse('2026-08-20T14:59:00Z')), '23:59')
})

inEveryZone('formatMonth names the month Japan time is in', () => {
  assert.equal(formatMonth('2026-08-20T11:50:46Z'), '2026/08')
  assert.equal(formatMonth('2026-07-31T15:00:00Z'), '2026/08')
  assert.equal(formatMonth('2026-12-31T15:00:00Z'), '2027/01')
})

/**
 * Setting `process.env.TZ` above moves the clock the running process reads,
 * but a formatter built at import time has already taken its zone by then, so
 * that sweep on its own would stay green on a machine that happens to sit in
 * Japan. Starting a whole process in a hostile zone closes that door: the same
 * four stamps, spelled by a module that has never seen anything but a zone
 * that is not the one the screens are in.
 */
const SPELL_OUT = `
const stamps = await import(${JSON.stringify(new URL('./format.ts', import.meta.url).href)})

process.stdout.write(
  [
    stamps.formatDateTime('2026-08-20T11:50:46Z'),
    stamps.formatStamp('2026-08-20T11:50:46Z'),
    stamps.formatClock(Date.parse('2026-08-20T15:00:00Z')),
    stamps.formatMonth('2026-07-31T15:00:00Z'),
  ].join('|'),
)
`

for (const zone of ZONES) {
  test(`a process that starts in ${zone} still spells Japan time`, () => {
    const spoken = execFileSync(
      process.execPath,
      ['--input-type=module', '--eval', SPELL_OUT],
      { env: { ...process.env, TZ: zone }, encoding: 'utf8' },
    )

    assert.equal(spoken, '2026/08/20 20:50|08/20 20:50|00:00|2026/08')
  })
}

test('the summer of a zone that keeps daylight saving does not shift it', () => {
  underZone('America/New_York', () => {
    assert.equal(formatDateTime('2026-01-20T11:50:46Z'), '2026/01/20 20:50')
    assert.equal(formatDateTime('2026-08-20T11:50:46Z'), '2026/08/20 20:50')
  })
})

test('formatBytes rounds to the unit the size deserves', () => {
  assert.equal(formatBytes(0), '0 B')
  assert.equal(formatBytes(2048), '2 KB')
  assert.equal(formatBytes(5 * 1024 ** 2), '5 MB')
  assert.equal(formatBytes(3 * 1024 ** 3), '3.0 GB')
})

test('formatPlayhead keeps the hour so the two readings line up', () => {
  assert.equal(formatPlayhead(0), '0:00:00')
  assert.equal(formatPlayhead(392), '0:06:32')
  assert.equal(formatPlayhead(3932), '1:05:32')
  assert.equal(formatPlayhead(-4), '0:00:00')
  assert.equal(formatPlayhead(12.7), '0:00:12')
})

test('formatLength drops the hour when there is none', () => {
  assert.equal(formatLength(392), '6:32')
  assert.equal(formatLength(3932), '1:05:32')
})

test('formatSpan spells an elapsed span in Japanese', () => {
  assert.equal(formatSpan(32), '32秒')
  assert.equal(formatSpan(392), '6分32秒')
})
