import { useState } from 'react'
import type { Decorator, Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, within } from 'storybook/test'

import { CHANNEL_FIXTURES } from '@/repository/channels.fixtures'
import { COLLECTION_FIXTURES } from '@/repository/collection.fixtures'
import {
  GUIDE_DAYS,
  NOW_LABEL,
  NOW_MIN,
  PROGRAM_FIXTURES,
} from '@/repository/programs.fixtures'
import { HOUR_PX } from '@/components/guide/guide-metrics'
import { GuideView } from '@/components/guide/guide-page'

const base = {
  kind: 'terrestrial' as const,
  day: GUIDE_DAYS[1],
  days: GUIDE_DAYS,
  windowStartHour: 19,
  windowHours: 8,
  nowMin: NOW_MIN,
  nowLabel: NOW_LABEL,
  channels: CHANNEL_FIXTURES,
  programs: PROGRAM_FIXTURES,
}

const meta = {
  title: 'Screens/番組表',
  component: GuideView,
  parameters: { layout: 'fullscreen' },
  args: {
    collection: COLLECTION_FIXTURES,
    onCollectNow: async () => ({ state: 'started' as const, streams: 7 }),
    onRebuild: async () => ({ state: 'ok' as const, discarded: 3521 }),
  },
  decorators: [
    (Story) => (
      <div className="dot-grid flex h-dvh flex-col overflow-hidden bg-bg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GuideView>

export default meta
type Story = StoryObj<typeof meta>

/**
 * The order the grid lays cells out in: a column per channel, and inside a
 * column the programmes in the order they were given. Knowing it lets each cell
 * be held against the programme it was drawn from rather than against whichever
 * cell happens to contain a matching run of text.
 */
const IN_GRID_ORDER = CHANNEL_FIXTURES.flatMap((channel) =>
  PROGRAM_FIXTURES.filter((program) => program.channelId === channel.id),
)

export const 通常: Story = {
  args: { guide: base },
  /**
   * A cell says what its genre is in words, not only in the colour it is
   * filled with. Every cell in the grid, including the ten-minute one in the
   * narrowest column, where words are the first thing a cell runs out of room
   * for.
   */
  play: async ({ canvasElement }) => {
    const cells = Array.from(
      canvasElement.querySelectorAll<HTMLElement>(
        '[data-opens="program-panel"]',
      ),
    )

    await expect(cells).toHaveLength(IN_GRID_ORDER.length)

    for (const [index, program] of IN_GRID_ORDER.entries()) {
      await expect(cells[index]).toHaveTextContent(program.title)
      await expect(cells[index]).toHaveTextContent(program.genreLabel)
    }
  },
}

/**
 * What tells a programme that has ended from one still to come, held against
 * the paint the browser resolved rather than against a class name.
 *
 * Three things are asked of it. Every ended cell is drawn on the same face, so
 * the elapsed part of the grid reads as one thing rather than as ten weakened
 * tints. That face is not a tint any cell is given while it is still to come.
 * And a cell keeps the hairline of its genre either way, so what is given up
 * in order to say a programme has ended is not what says what it is.
 */
export const 放送済み: Story = {
  args: { guide: base },
  play: async ({ canvasElement }) => {
    const cells = Array.from(
      canvasElement.querySelectorAll<HTMLElement>(
        '[data-opens="program-panel"]',
      ),
    )

    const ended: { genre: string; cell: HTMLElement }[] = []
    const ahead: { genre: string; cell: HTMLElement }[] = []
    for (const [index, program] of IN_GRID_ORDER.entries()) {
      const over =
        !program.endUndecided &&
        program.startMin + program.durationMin <= NOW_MIN
      const into = over ? ended : ahead
      into.push({ genre: program.genre, cell: cells[index] })
    }

    await expect(ended.length).toBeGreaterThan(0)
    await expect(ahead.length).toBeGreaterThan(0)

    const face = getComputedStyle(ended[0].cell).backgroundColor
    for (const { cell } of ended) {
      await expect(getComputedStyle(cell).backgroundColor).toBe(face)
      await expect(getComputedStyle(cell).borderTopStyle).toBe('dashed')
    }

    for (const { cell } of ahead) {
      await expect(getComputedStyle(cell).backgroundColor).not.toBe(face)
      await expect(getComputedStyle(cell).borderTopStyle).toBe('solid')
    }

    for (const { genre, cell } of ended) {
      const live = ahead.find((it) => it.genre === genre)
      if (live) {
        await expect(getComputedStyle(cell).borderTopColor).toBe(
          getComputedStyle(live.cell).borderTopColor,
        )
      }
    }
  },
}

/**
 * The window the guide is really drawn on: a whole broadcast day, four in the
 * morning to four in the morning, which is taller than any screen. The
 * fixtures are written for one evening of it, so they are placed at the hour
 * they belong to rather than at the top.
 */
const EVENING_MIN = (19 - 4) * 60

const day = {
  ...base,
  windowStartHour: 4,
  windowHours: 24,
  nowMin: EVENING_MIN + NOW_MIN,
  programs: PROGRAM_FIXTURES.map((program) => ({
    ...program,
    startMin: program.startMin + EVENING_MIN,
  })),
}

/**
 * A height the day cannot fit into, fixed rather than taken from whichever
 * screen the story is run on, so that what is asked of the scroll position is
 * asked of the same layout every time.
 */
const shorterThanADay: Decorator = (Story) => (
  <div className="flex h-[720px] flex-col overflow-hidden">
    <Story />
  </div>
)

function partOf(canvasElement: HTMLElement, selector: string): HTMLElement {
  const part = canvasElement.querySelector<HTMLElement>(selector)

  if (!part) {
    throw new Error(`the guide has no ${selector}`)
  }

  return part
}

/**
 * Where a day that holds the present opens: half an hour above the line, so
 * that the programme on air is on screen the moment the guide is, with the end
 * of the one before it still in view. A day is a screen and a half of grid or
 * more, and the top of it is four in the morning — of no use to someone
 * opening the guide in the evening to see what is on.
 */
export const 現在時刻の位置で開く: Story = {
  args: { guide: day },
  decorators: [shorterThanADay],
  play: async ({ canvasElement }) => {
    const scroller = partOf(canvasElement, '[data-guide-scroll]')
    const line = partOf(canvasElement, '[data-now-line]')

    await expect(scroller.scrollTop).toBeCloseTo(
      line.offsetTop - HOUR_PX / 2,
      0,
    )

    const grid = scroller.getBoundingClientRect()
    const now = line.getBoundingClientRect()

    await expect(now.top).toBeGreaterThan(grid.top)
    await expect(now.bottom).toBeLessThan(grid.bottom)
  },
}

/** The minutes a re-read of the page moves the present on by. */
const A_WHILE_MIN = 6

function clockAt(windowStartHour: number, min: number): string {
  const at = windowStartHour * 60 + min

  return `${String(Math.floor(at / 60) % 24).padStart(2, '0')}:${String(at % 60).padStart(2, '0')}`
}

/**
 * A page re-read while it is being looked at, which is what the live signal
 * does to the guide: the same screen arrives again, a while later and as a
 * fresh set of objects, without the grid being taken down and put back up.
 *
 * The reader has scrolled somewhere of their own by then, and that is where
 * they stay. The opening position is where the guide opens, not somewhere it
 * returns to.
 */
export const 読み直しても動かない: Story = {
  args: { guide: day },
  decorators: [shorterThanADay],
  render: function Reread(args) {
    const [reads, setReads] = useState(0)
    const nowMin = (args.guide.nowMin ?? 0) + reads * A_WHILE_MIN

    return (
      <>
        <GuideView
          {...args}
          guide={{
            ...args.guide,
            nowMin,
            nowLabel: clockAt(args.guide.windowStartHour, nowMin),
            programs: args.guide.programs.map((program) => ({ ...program })),
          }}
        />
        <button
          type="button"
          onClick={() => setReads(reads + 1)}
          className="fixed top-1 left-1 z-50 rounded-full border border-edge bg-surface px-3 py-1 text-sub"
        >
          読み直す
        </button>
      </>
    )
  },
  play: async ({ canvasElement }) => {
    const scroller = partOf(canvasElement, '[data-guide-scroll]')
    const was = partOf(canvasElement, '[data-now-line]').offsetTop
    const moved = 320

    scroller.scrollTop = moved

    await userEvent.click(
      within(canvasElement).getByRole('button', { name: '読み直す' }),
    )

    await expect(
      partOf(canvasElement, '[data-now-line]').offsetTop,
    ).toBeCloseTo(was + (A_WHILE_MIN / 60) * HOUR_PX, 0)
    await expect(scroller.scrollTop).toBeCloseTo(moved, 0)
  },
}

export const 健全性バナー: Story = {
  args: {
    guide: {
      ...base,
      coverageWarning: {
        emphasis: '湾岸放送1 の番組情報が不足しています。',
        body: 'EPG の収集が連続して揃っていません。',
      },
    },
  },
}

/**
 * A day the present is not in. There is no line to open half an hour above, so
 * the guide opens where the broadcast day does.
 */
export const 別の日: Story = {
  args: {
    guide: {
      ...base,
      day: GUIDE_DAYS[2],
      nowMin: undefined,
      nowLabel: undefined,
    },
  },
  decorators: [shorterThanADay],
  play: async ({ canvasElement }) => {
    const scroller = partOf(canvasElement, '[data-guide-scroll]')

    await expect(canvasElement.querySelector('[data-now-line]')).toBeNull()
    await expect(scroller.scrollTop).toBe(0)
  },
}

export const 番組情報が不足: Story = {
  args: {
    guide: {
      ...base,
      kind: 'bs',
      channels: [],
      programs: [],
    },
  },
}
