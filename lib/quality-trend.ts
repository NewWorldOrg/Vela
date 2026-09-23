import { DISPLAY_ZONE, formatClock, formatDate } from '@/lib/format'
import type { QualityLevel } from '@/lib/quality'

export interface TrendReading {
  from: number
  until: number
  level: QualityLevel
  worst?: number
}

export interface TrendStep {
  x1: number
  x2: number
  y: number
  over: boolean
}

export interface TrendRiser {
  x: number
  from: number
  to: number
}

export interface TrendColumn {
  x: number
  width: number
}

export interface TrendPlot {
  top: number
  line?: number
  steps: TrendStep[]
  risers: TrendRiser[]
  columns: TrendColumn[]
}

export interface TrendTick {
  at: number
  x: number
}

export interface TrendAxisTick {
  x: number
  says: string
  room: number
}

export interface TrendAxis {
  opens: string
  closes: string
  ticks: TrendAxisTick[]
}

const HEADROOM = 1.25

const MEASURED: ReadonlySet<QualityLevel> = new Set(['good', 'warn', 'bad'])

const OVER: ReadonlySet<QualityLevel> = new Set(['warn', 'bad'])

const HOUR = 60 * 60 * 1000

const A_DAY = 24 * HOUR

interface Grain {
  within: number
  align: number
  step: number
}

const GRAINS: Grain[] = [
  { within: 1, align: 6 * HOUR, step: 6 * HOUR },
  { within: 7, align: A_DAY, step: A_DAY },
  { within: Infinity, align: A_DAY, step: 5 * A_DAY },
]

const GAP = 2

const ZONED = new Intl.DateTimeFormat('en-US', {
  timeZone: DISPLAY_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
})

function rounded(value: number): number {
  return Math.round(value * 1000) / 1000
}

function across(at: number, from: number, until: number): number {
  return rounded(((at - from) / (until - from)) * 100)
}

function clipped(at: number, from: number, until: number): number {
  return across(Math.min(Math.max(at, from), until), from, until)
}

function heightOf(value: number, top: number): number {
  return rounded(100 - Math.min(Math.max(value / top, 0), 1) * 100)
}

function offsetAt(at: number): number {
  const parts = ZONED.formatToParts(new Date(at))
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0)
  const wall = Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    read('hour'),
    read('minute'),
    read('second'),
  )

  return wall - Math.floor(at / 1000) * 1000
}

function measured(reading: TrendReading): reading is TrendReading & {
  worst: number
} {
  return reading.worst !== undefined && MEASURED.has(reading.level)
}

export function plotTrend(
  readings: TrendReading[],
  from: number,
  until: number,
  threshold?: number,
): TrendPlot {
  if (until <= from) {
    return { top: 1, steps: [], risers: [], columns: [] }
  }

  const highest = Math.max(
    0,
    threshold ?? 0,
    ...readings.filter(measured).map((one) => one.worst),
  )
  const top = highest > 0 ? highest * HEADROOM : 1
  const steps: TrendStep[] = []
  const risers: TrendRiser[] = []

  readings.forEach((reading, index) => {
    if (!measured(reading)) {
      return
    }

    const step = {
      x1: clipped(reading.from, from, until),
      x2: clipped(reading.until, from, until),
      y: heightOf(reading.worst, top),
      over: OVER.has(reading.level),
    }
    const before = readings[index - 1]

    if (
      before !== undefined &&
      measured(before) &&
      before.until === reading.from &&
      steps.length > 0 &&
      steps[steps.length - 1].y !== step.y
    ) {
      risers.push({ x: step.x1, from: steps[steps.length - 1].y, to: step.y })
    }

    steps.push(step)
  })

  return {
    top,
    line: threshold === undefined ? undefined : heightOf(threshold, top),
    steps,
    risers,
    columns: readings.map((reading) => {
      const x = clipped(reading.from, from, until)

      return { x, width: rounded(clipped(reading.until, from, until) - x) }
    }),
  }
}

export function trendTicks(
  from: number,
  until: number,
  days: number,
): TrendTick[] {
  if (until <= from) {
    return []
  }

  const grain = GRAINS.find((one) => days <= one.within) ?? GRAINS[0]
  const offset = offsetAt(from)
  const first =
    Math.floor((from + offset) / grain.align) * grain.align +
    grain.align -
    offset
  const ticks: TrendTick[] = []

  for (let at = first; at < until; at += grain.step) {
    ticks.push({ at, x: across(at, from, until) })
  }

  return ticks
}

function roomFor(
  says: string,
  x: number,
  neighbours: number[],
  ends: number,
): number {
  const fromEnds = (ends + says.length / 2 + GAP) / (Math.min(x, 100 - x) / 100)
  const fromNeighbours = neighbours.map(
    (other) => (says.length + GAP) / (Math.abs(other - x) / 100),
  )

  return Math.ceil(Math.max(fromEnds, ...fromNeighbours))
}

export function trendAxis(
  from: number,
  until: number,
  days: number,
): TrendAxis {
  const hourly = days <= 1
  const end = (at: number) =>
    hourly ? formatClock(at) : `${formatDate(at)} ${formatClock(at)}`
  const opens = end(from)
  const closes = end(until)
  const ticks = trendTicks(from, until, days)

  return {
    opens,
    closes,
    ticks: ticks.map((tick, index) => {
      const says = hourly ? formatClock(tick.at) : formatDate(tick.at)
      const apart = index % 2 === 0 ? 2 : 1
      const neighbours = [ticks[index - apart], ticks[index + apart]]
        .filter((one) => one !== undefined)
        .map((one) => one.x)

      return {
        x: tick.x,
        says,
        room: roomFor(
          says,
          tick.x,
          neighbours,
          Math.max(opens.length, closes.length),
        ),
      }
    }),
  }
}
