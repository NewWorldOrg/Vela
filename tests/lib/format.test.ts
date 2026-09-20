import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { test } from 'node:test'

import {
  formatBytes,
  formatClock,
  formatLength,
  formatMoment,
  formatMomentSpan,
  formatMonth,
  formatPlayhead,
  formatPlayerTime,
  formatSpan,
  formatSpanToTheMillisecond,
} from '@/lib/format'

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

function inEveryZone(name: string, check: () => void): void {
  for (const zone of ZONES) {
    test(`${name} — TZ=${zone}`, () => {
      underZone(zone, check)
    })
  }
}

const A_DAY_IN_2026 = '2026-06-01T00:00:00Z'

inEveryZone('formatMoment spells a UTC instant in Japan time', () => {
  assert.equal(
    formatMoment('2026-08-20T11:50:46Z', A_DAY_IN_2026),
    '08/20(木) 20:50',
  )
  assert.equal(
    formatMoment('2026-08-20T11:50:46.482193Z', A_DAY_IN_2026),
    '08/20(木) 20:50',
  )
})

inEveryZone('formatMoment carries an instant over into the next day', () => {
  assert.equal(
    formatMoment('2026-08-20T15:00:00Z', A_DAY_IN_2026),
    '08/21(金) 00:00',
  )
  assert.equal(
    formatMoment('2026-12-31T14:59:00Z', A_DAY_IN_2026),
    '12/31(木) 23:59',
  )
  assert.equal(
    formatMoment('2026-12-31T15:00:00Z', A_DAY_IN_2026),
    '2027/01/01(金) 00:00',
  )
})

inEveryZone('formatMoment reads the offset an instant carries', () => {
  assert.equal(
    formatMoment('2026-08-20T20:50:46+09:00', A_DAY_IN_2026),
    '08/20(木) 20:50',
  )
  assert.equal(
    formatMoment('2026-08-20T07:50:46-04:00', A_DAY_IN_2026),
    '08/20(木) 20:50',
  )
})

inEveryZone('formatMoment keeps the year only when it is not this one', () => {
  assert.equal(
    formatMoment('2026-08-20T11:50:46Z', A_DAY_IN_2026),
    '08/20(木) 20:50',
  )
  assert.equal(
    formatMoment('2027-08-20T11:50:46Z', A_DAY_IN_2026),
    '2027/08/20(金) 20:50',
  )
  assert.equal(
    formatMoment('2025-08-20T11:50:46Z', A_DAY_IN_2026),
    '2025/08/20(水) 20:50',
  )
})

inEveryZone('formatMomentSpan writes one range with one dash', () => {
  assert.equal(
    formatMomentSpan(
      '2026-08-20T11:50:00Z',
      '2026-08-20T12:50:00Z',
      A_DAY_IN_2026,
    ),
    '08/20(木) 20:50 – 21:50',
  )
})

inEveryZone(
  'formatMomentSpan spells the far side when a span crosses a day',
  () => {
    assert.equal(
      formatMomentSpan(
        '2026-08-20T14:50:00Z',
        '2026-08-20T15:10:00Z',
        A_DAY_IN_2026,
      ),
      '08/20(木) 23:50 – 08/21(金) 00:10',
    )
    assert.equal(
      formatMomentSpan(
        '2026-12-31T14:50:00Z',
        '2026-12-31T15:10:00Z',
        A_DAY_IN_2026,
      ),
      '12/31(木) 23:50 – 2027/01/01(金) 00:10',
    )
  },
)

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

const SPELL_OUT = `
const stamps = await import(${JSON.stringify(new URL('../../lib/format.ts', import.meta.url).href)})

process.stdout.write(
  [
    stamps.formatMoment('2026-08-20T11:50:46Z', '2026-06-01T00:00:00Z'),
    stamps.formatMomentSpan(
      '2026-08-20T11:50:46Z',
      '2026-08-20T12:50:46Z',
      '2026-06-01T00:00:00Z',
    ),
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

    assert.equal(
      spoken,
      '08/20(木) 20:50|08/20(木) 20:50 – 21:50|00:00|2026/08',
    )
  })
}

test('a span shown to the millisecond keeps the three digits it was given', () => {
  assert.equal(formatSpanToTheMillisecond(0), '0.000秒')
  assert.equal(formatSpanToTheMillisecond(7), '0.007秒')
  assert.equal(formatSpanToTheMillisecond(482), '0.482秒')
  assert.equal(formatSpanToTheMillisecond(1000), '1.000秒')
  assert.equal(formatSpanToTheMillisecond(59999), '59.999秒')
  assert.equal(formatSpanToTheMillisecond(60000), '1分0.000秒')
  assert.equal(formatSpanToTheMillisecond(402000 + 250), '6分42.250秒')
})

test('the summer of a zone that keeps daylight saving does not shift it', () => {
  underZone('America/New_York', () => {
    assert.equal(
      formatMoment('2026-01-20T11:50:46Z', A_DAY_IN_2026),
      '01/20(火) 20:50',
    )
    assert.equal(
      formatMoment('2026-08-20T11:50:46Z', A_DAY_IN_2026),
      '08/20(木) 20:50',
    )
  })
})

test('formatBytes rounds to the unit the size deserves', () => {
  assert.equal(formatBytes(0), '0 B')
  assert.equal(formatBytes(2048), '2 KB')
  assert.equal(formatBytes(5 * 1024 ** 2), '5 MB')
  assert.equal(formatBytes(3 * 1024 ** 3), '3.0 GB')
  assert.equal(formatBytes(4 * 1024 ** 4), '4.0 TB')
})

test('formatPlayhead keeps the hour so the two readings line up', () => {
  assert.equal(formatPlayhead(0), '0:00:00')
  assert.equal(formatPlayhead(392), '0:06:32')
  assert.equal(formatPlayhead(3932), '1:05:32')
  assert.equal(formatPlayhead(-4), '0:00:00')
  assert.equal(formatPlayhead(12.7), '0:00:12')
})

test('formatPlayerTime writes a bar reading, hour only where there is one', () => {
  assert.equal(formatPlayerTime(0), '0:00')
  assert.equal(formatPlayerTime(392), '6:32')
  assert.equal(formatPlayerTime(3932), '1:05:32')
  assert.equal(formatPlayerTime(-4), '0:00')
  assert.equal(formatPlayerTime(12.7), '0:12')
})

test('formatPlayerTime writes each figure at its own width', () => {
  assert.equal(
    `${formatPlayerTime(0)} / ${formatPlayerTime(7191)}`,
    '0:00 / 1:59:51',
  )
  assert.equal(
    `${formatPlayerTime(3599)} / ${formatPlayerTime(7191)}`,
    '59:59 / 1:59:51',
  )
  assert.equal(
    `${formatPlayerTime(3600)} / ${formatPlayerTime(7191)}`,
    '1:00:00 / 1:59:51',
  )
})

test('formatLength drops the hour when there is none', () => {
  assert.equal(formatLength(392), '6:32')
  assert.equal(formatLength(3932), '1:05:32')
})

test('formatSpan spells an elapsed span in Japanese', () => {
  assert.equal(formatSpan(32), '32秒')
  assert.equal(formatSpan(392), '6分32秒')
})
