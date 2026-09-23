import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { QualityLevel } from '@/lib/quality'
import type { TrendReading } from '@/lib/quality-trend'
import { plotTrend, trendAxis, trendTicks } from '@/lib/quality-trend'

const HOUR = 60 * 60 * 1000

const A_DAY = 24 * HOUR

const FROM = Date.UTC(2026, 8, 7, 15, 0)

const UNTIL = FROM + A_DAY

const hourly = (
  worsts: (number | undefined)[],
  levels: QualityLevel[] = worsts.map((one) =>
    one === undefined ? 'nodata' : 'good',
  ),
): TrendReading[] =>
  worsts.map((worst, at) => ({
    from: FROM + at * HOUR,
    until: FROM + (at + 1) * HOUR,
    level: levels[at],
    worst,
  }))

const flat = (plot: ReturnType<typeof plotTrend>) =>
  plot.steps.map(({ x1, x2, y }) => [x1, x2, y])

test('刻みは始まりから終わりまでの水平の線で、縦は上端に対する高さで下から測る', () => {
  const plot = plotTrend(hourly([0, 0.01]), FROM, FROM + 2 * HOUR, 0.02)

  assert.equal(plot.top, 0.025)
  assert.deepEqual(flat(plot), [
    [0, 50, 100],
    [50, 100, 60],
  ])
  assert.equal(plot.line, 20)
})

test('幅の揃わない刻みは、要素の順番ではなく時刻の比で置かれる', () => {
  const readings: TrendReading[] = [
    { from: FROM, until: FROM + 16 * HOUR, level: 'good', worst: 0.0009 },
    {
      from: FROM + 16 * HOUR,
      until: FROM + 18 * HOUR,
      level: 'good',
      worst: 0.0004,
    },
    { from: FROM + 18 * HOUR, until: UNTIL, level: 'good', worst: 0.0002 },
  ]
  const plot = plotTrend(readings, FROM, UNTIL, 0.02)

  assert.deepEqual(
    plot.steps.map(({ x1, x2 }) => [x1, x2]),
    [
      [0, 66.667],
      [66.667, 75],
      [75, 100],
    ],
  )
  assert.deepEqual(plot.columns, [
    { x: 0, width: 66.667 },
    { x: 66.667, width: 8.333 },
    { x: 75, width: 25 },
  ])
})

test('放送日の刻みが 2 つだけの 24 時間: 測った刻みは 16 時間分の線、測っていない刻みは線を持たない', () => {
  const readings: TrendReading[] = [
    { from: FROM, until: FROM + 16 * HOUR, level: 'good', worst: 0.000895 },
    { from: FROM + 16 * HOUR, until: UNTIL, level: 'nodata' },
  ]
  const plot = plotTrend(readings, FROM, UNTIL, 0.02)

  assert.deepEqual(
    plot.steps.map(({ x1, x2 }) => [x1, x2]),
    [[0, 66.667]],
  )
  assert.deepEqual(plot.risers, [])
  assert.equal(plot.columns.length, 2)
})

test('期間の外にはみ出した刻みは、期間の端で切る', () => {
  const readings: TrendReading[] = [
    {
      from: FROM - 4 * HOUR,
      until: FROM + 12 * HOUR,
      level: 'good',
      worst: 0.01,
    },
    {
      from: UNTIL - 6 * HOUR,
      until: UNTIL + 18 * HOUR,
      level: 'good',
      worst: 0.01,
    },
  ]
  const plot = plotTrend(readings, FROM, UNTIL, 0.02)

  assert.deepEqual(
    plot.steps.map(({ x1, x2 }) => [x1, x2]),
    [
      [0, 50],
      [75, 100],
    ],
  )
  assert.deepEqual(plot.columns, [
    { x: 0, width: 50 },
    { x: 75, width: 25 },
  ])
})

test('上端は最悪値の最大と閾値の大きい方の 1.25 倍', () => {
  assert.equal(plotTrend(hourly([0.04, 0.01]), FROM, UNTIL, 0.02).top, 0.05)
  assert.equal(plotTrend(hourly([0.001]), FROM, UNTIL, 0.02).top, 0.025)
  assert.equal(plotTrend(hourly([0.04]), FROM, UNTIL).top, 0.05)
})

test('何も値が無く閾値も 0 なら、上端は 1 に倒して割り算を避ける', () => {
  const plot = plotTrend(hourly([0, undefined]), FROM, UNTIL, 0)

  assert.equal(plot.top, 1)
  assert.equal(plot.steps[0].y, 100)
})

test('続いて測った刻みどうしは縦の線でつながり、測っていない刻みで切れる', () => {
  const plot = plotTrend(
    hourly([0.01, 0.005, undefined, 0.01, 0.004, 0.01]),
    FROM,
    FROM + 6 * HOUR,
    0.02,
  )

  assert.equal(plot.steps.length, 5)
  assert.deepEqual(plot.risers, [
    { x: 16.667, from: 60, to: 80 },
    { x: 66.667, from: 60, to: 84 },
    { x: 83.333, from: 84, to: 60 },
  ])
})

test('時刻の間が空いた刻みどうしは、並びが続いていても縦の線でつながない', () => {
  const readings: TrendReading[] = [
    { from: FROM, until: FROM + HOUR, level: 'good', worst: 0.01 },
    {
      from: FROM + 3 * HOUR,
      until: FROM + 4 * HOUR,
      level: 'good',
      worst: 0.005,
    },
  ]

  assert.deepEqual(plotTrend(readings, FROM, FROM + 4 * HOUR, 0.02).risers, [])
})

test('孤立した刻みも、点ではなくその幅の水平線になる', () => {
  const plot = plotTrend(
    hourly([undefined, 0.01, undefined, undefined]),
    FROM,
    FROM + 4 * HOUR,
    0.02,
  )

  assert.deepEqual(plot.risers, [])
  assert.deepEqual(flat(plot), [[25, 50, 60]])
})

test('値があっても対象なし・未計測・非対応・取得できずの刻みは測っていない扱いで、0 として描かない', () => {
  const plot = plotTrend(
    hourly(
      [0.01, 0, 0, 0, 0, 0.01],
      ['good', 'nodata', 'unmeasured', 'unsupported', 'unreachable', 'good'],
    ),
    FROM,
    FROM + 6 * HOUR,
    0.02,
  )

  assert.equal(plot.steps.length, 2)
  assert.deepEqual(plot.risers, [])
})

test('閾値を越えた刻みだけが越えた印を持ち、下が悪い対象でも刻みの判定に従う', () => {
  const plot = plotTrend(
    hourly([99.5, 62, 12], ['good', 'warn', 'bad']),
    FROM,
    FROM + 3 * HOUR,
    99,
  )

  assert.deepEqual(
    plot.steps.map((one) => one.over),
    [false, true, true],
  )
})

test('0 より下の値は下端に、上端より上には出ない', () => {
  const plot = plotTrend(hourly([-3, 20]), FROM, FROM + 2 * HOUR, 15)

  assert.equal(plot.steps[0].y, 100)
  assert.equal(plot.steps[1].y, 20)
})

test('刻みごとの止まり場所は、測ったかどうかによらず刻みの幅で並ぶ', () => {
  const plot = plotTrend(
    hourly([undefined, 0.01, undefined, undefined]),
    FROM,
    FROM + 4 * HOUR,
    0.02,
  )

  assert.deepEqual(plot.columns, [
    { x: 0, width: 25 },
    { x: 25, width: 25 },
    { x: 50, width: 25 },
    { x: 75, width: 25 },
  ])
})

test('閾値が無ければ破線も無い', () => {
  assert.equal(plotTrend(hourly([0.01]), FROM, UNTIL).line, undefined)
})

test('24 時間は表示の時刻の 6 時間ごと、両端は含めない', () => {
  const ticks = trendTicks(FROM + 20 * 60 * 1000, UNTIL + 20 * 60 * 1000, 1)

  assert.deepEqual(
    ticks.map((one) => new Date(one.at).toISOString()),
    [
      '2026-09-07T21:00:00.000Z',
      '2026-09-08T03:00:00.000Z',
      '2026-09-08T09:00:00.000Z',
      '2026-09-08T15:00:00.000Z',
    ],
  )
})

test('目盛りの横位置は刻みの点と同じ割り方', () => {
  const [first] = trendTicks(FROM, UNTIL, 1)

  assert.equal(first.at, FROM + 6 * HOUR)
  assert.equal(first.x, 25)
})

test('7 日は表示の日付の変わり目ごと', () => {
  const from = Date.UTC(2026, 8, 1, 5, 23)
  const ticks = trendTicks(from, from + 7 * A_DAY, 7)

  assert.equal(ticks.length, 7)
  assert.equal(new Date(ticks[0].at).toISOString(), '2026-09-01T15:00:00.000Z')
  assert.equal(ticks[1].at - ticks[0].at, A_DAY)
})

test('30 日は最初の日付の変わり目から 5 日ごと', () => {
  const from = Date.UTC(2026, 7, 10, 5, 23)
  const ticks = trendTicks(from, from + 30 * A_DAY, 30)

  assert.equal(ticks.length, 6)
  assert.equal(new Date(ticks[0].at).toISOString(), '2026-08-10T15:00:00.000Z')
  assert.equal(ticks[1].at - ticks[0].at, 5 * A_DAY)
})

test('期間が空なら目盛りも点も無い', () => {
  assert.deepEqual(trendTicks(FROM, FROM, 1), [])
  assert.deepEqual(plotTrend([], FROM, FROM, 0.02).steps, [])
})

test('24 時間の横軸は両端も目盛りも時刻だけで書く', () => {
  const axis = trendAxis(FROM + 5 * HOUR, UNTIL + 5 * HOUR, 1)

  assert.equal(axis.opens, '05:00')
  assert.equal(axis.closes, '05:00')
  assert.deepEqual(
    axis.ticks.map((one) => one.says),
    ['06:00', '12:00', '18:00', '00:00'],
  )
})

test('目盛りの字は、端の字と隣の字にぶつからない横幅(字数)を持ち、1 つおきの字が先に出る', () => {
  const axis = trendAxis(FROM + 5 * HOUR, UNTIL + 5 * HOUR, 1)

  assert.deepEqual(
    axis.ticks.map((one) => one.room),
    [228, 33, 21, 46],
  )
})

test('7 日と 30 日の横軸は、両端を日付と時刻で、目盛りを日付で書く', () => {
  const from = Date.UTC(2026, 8, 1, 5, 23)
  const axis = trendAxis(from, from + 7 * A_DAY, 7)

  assert.equal(axis.opens, '09/01 14:23')
  assert.equal(axis.closes, '09/08 14:23')
  assert.deepEqual(
    axis.ticks.map((one) => one.says),
    ['09/02', '09/03', '09/04', '09/05', '09/06', '09/07', '09/08'],
  )
  assert.ok(axis.ticks[0].room > axis.ticks[3].room)
})
