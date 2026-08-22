import { useState } from 'react'
import type { Decorator, Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, within } from 'storybook/test'

import { COLUMN_MIN_PX, gridMinWidthOf } from '@/lib/guide'
import {
  AERIAL_CHANNEL_FIXTURES,
  CHANNEL_FIXTURES,
} from '@/repository/channels.fixtures'
import { COLLECTION_FIXTURES } from '@/repository/collection.fixtures'
import {
  AERIAL_PROGRAM_FIXTURES,
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

/**
 * A window of a fixed size, so that what is asked of the column widths is
 * asked of the same layout wherever the story is run. 1400 is the width the
 * screens are drawn at, and the width the guide has to stay readable at.
 */
const aScreenWide: Decorator = (Story) => (
  <div className="flex h-[720px] w-[1400px] flex-col overflow-hidden">
    <Story />
  </div>
)

/** The four services of a line-up small enough to leave room to spare. */
const FEW_SERVICES = CHANNEL_FIXTURES.filter((channel) => !channel.sub).slice(
  0,
  4,
)

function widthOf(part: HTMLElement): number {
  return part.getBoundingClientRect().width
}

/**
 * Few enough channels for the screen they are read on: the columns share the
 * width that is there and the grid does not run off the side. The floor a
 * column is given is a floor and not a width — a guide of four services is not
 * drawn as four narrow columns with the rest of the screen left empty.
 */
export const 列が余れば分け合う: Story = {
  args: {
    guide: {
      ...base,
      channels: FEW_SERVICES,
      programs: PROGRAM_FIXTURES.filter((program) =>
        FEW_SERVICES.some((channel) => channel.id === program.channelId),
      ),
    },
  },
  decorators: [aScreenWide],
  play: async ({ canvasElement }) => {
    const scroller = partOf(canvasElement, '[data-guide-scroll]')
    const columns = Array.from(
      canvasElement.querySelectorAll<HTMLElement>('[data-guide-column]'),
    )

    await expect(columns).toHaveLength(FEW_SERVICES.length)
    await expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth)

    for (const column of columns) {
      await expect(widthOf(column)).toBeGreaterThan(COLUMN_MIN_PX)
      await expect(widthOf(column)).toBeCloseTo(widthOf(columns[0]), 0)
    }

    const last = columns[columns.length - 1].getBoundingClientRect()
    await expect(last.right).toBeCloseTo(
      scroller.getBoundingClientRect().right,
      0,
    )
  },
}

/** Four services of a line-up, one of which has split. */
const SERVICES_ONE_OF_THEM_SPLIT = CHANNEL_FIXTURES.slice(0, 4)

/**
 * A service that has split is a service, and its column is a column. It shares
 * the width the others do, its name is set the same size on the same one line
 * with the number in front of it, and the programmes it carries are read the
 * way any other column's are.
 *
 * It was drawn narrow once, on the reading that a split is an hour borrowed
 * from the service it split from. It is not: a split service runs a schedule
 * of its own all day, and a column too narrow for a name breaks that schedule
 * down the page a character at a time. The hours it carries nothing are blank
 * hours, which is not a reason to take the width away from the hours it does.
 */
export const 副チャンネルも同じ列: Story = {
  args: {
    guide: {
      ...base,
      channels: SERVICES_ONE_OF_THEM_SPLIT,
      programs: PROGRAM_FIXTURES.filter((program) =>
        SERVICES_ONE_OF_THEM_SPLIT.some(
          (channel) => channel.id === program.channelId,
        ),
      ),
    },
  },
  decorators: [aScreenWide],
  play: async ({ canvasElement }) => {
    const split = SERVICES_ONE_OF_THEM_SPLIT.findIndex((channel) => channel.sub)
    await expect(split).toBeGreaterThan(-1)

    const columns = Array.from(
      canvasElement.querySelectorAll<HTMLElement>('[data-guide-column]'),
    )
    const headings = Array.from(
      canvasElement.querySelectorAll<HTMLElement>('[data-guide-heading]'),
    )
    const whole = split === 0 ? 1 : 0

    await expect(columns).toHaveLength(SERVICES_ONE_OF_THEM_SPLIT.length)
    await expect(headings).toHaveLength(SERVICES_ONE_OF_THEM_SPLIT.length)
    await expect(widthOf(columns[split])).toBeGreaterThan(COLUMN_MIN_PX)

    for (const index of SERVICES_ONE_OF_THEM_SPLIT.keys()) {
      await expect(widthOf(columns[index])).toBeCloseTo(
        widthOf(columns[split]),
        0,
      )
      await expect(widthOf(headings[index])).toBeCloseTo(
        widthOf(headings[split]),
        0,
      )
    }

    const set = getComputedStyle(headings[split])
    const like = getComputedStyle(headings[whole])

    await expect(set.fontSize).toBe(like.fontSize)
    await expect(set.whiteSpace).toBe(like.whiteSpace)
    await expect(set.lineHeight).toBe(like.lineHeight)

    const no = getComputedStyle(partOf(headings[split], 'span'))
    const noLike = getComputedStyle(partOf(headings[whole], 'span'))

    await expect(no.display).toBe(noLike.display)
    await expect(no.marginRight).toBe(noLike.marginRight)
  },
}

/**
 * The hours the split service has nothing of its own, read off the fixtures it
 * is given: it carries programmes over 19:00–21:00, 22:30–23:30 and
 * 02:00–03:00, and the two runs between them are the rest of the window.
 *
 * Written out rather than worked out, so that what the column is held against
 * is the schedule someone can read here and not a second run of the arithmetic
 * the column was drawn with.
 */
const UNSCHEDULED = [
  { startMin: 120, durationMin: 90 },
  { startMin: 270, durationMin: 150 },
]

/**
 * An hour the guide has no listing for, on a service that has not split.
 *
 * It leaves the same hole in the column and it does not mean the same thing:
 * that service is on air, and what is missing is the listing. Only a service
 * that has split says anything by carrying nothing.
 */
const A_LISTING_THAT_DID_NOT_ARRIVE = 'p014'

const SPLIT_LINE_UP = PROGRAM_FIXTURES.filter(
  (program) =>
    SERVICES_ONE_OF_THEM_SPLIT.some(
      (channel) => channel.id === program.channelId,
    ) && program.id !== A_LISTING_THAT_DID_NOT_ARRIVE,
)

/**
 * A column stands for a service all day, and a service that has split is only
 * showing something of its own for part of it. The hours it is not are the
 * hours it is carrying what the whole service is carrying, and a cell drawn
 * for them is the same programme printed twice, side by side.
 *
 * So those hours are said to be what they are — 編成なし — and the cells are
 * kept for the hours there really is a second programme. The column stays
 * either way: taking it out for part of a day would move every column to the
 * right of it, and what a reader is doing with a grid is reading across it.
 */
export const 副チャンネルは別番組の時間帯だけ: Story = {
  args: {
    guide: {
      ...base,
      channels: SERVICES_ONE_OF_THEM_SPLIT,
      programs: SPLIT_LINE_UP,
    },
  },
  decorators: [aScreenWide],
  play: async ({ canvasElement }) => {
    const split = SERVICES_ONE_OF_THEM_SPLIT.findIndex((channel) => channel.sub)
    const columns = Array.from(
      canvasElement.querySelectorAll<HTMLElement>('[data-guide-column]'),
    )
    const bands = Array.from(
      columns[split].querySelectorAll<HTMLElement>('[data-guide-unscheduled]'),
    )

    await expect(bands).toHaveLength(UNSCHEDULED.length)

    for (const [index, run] of UNSCHEDULED.entries()) {
      await expect(bands[index]).toHaveTextContent('編成なし')
      await expect(bands[index].offsetTop).toBeCloseTo(
        (run.startMin / 60) * HOUR_PX,
        0,
      )
      await expect(bands[index].offsetHeight).toBeCloseTo(
        (run.durationMin / 60) * HOUR_PX,
        0,
      )
    }

    const cells = Array.from(
      columns[split].querySelectorAll<HTMLElement>(
        '[data-opens="program-panel"]',
      ),
    )

    await expect(cells.length).toBeGreaterThan(0)

    for (const cell of cells) {
      for (const band of bands) {
        await expect(
          cell.offsetTop >= band.offsetTop + band.offsetHeight ||
            cell.offsetTop + cell.offsetHeight <= band.offsetTop,
        ).toBe(true)
      }
    }

    const holed = SERVICES_ONE_OF_THEM_SPLIT.findIndex(
      (channel) =>
        channel.id ===
        PROGRAM_FIXTURES.find(
          (program) => program.id === A_LISTING_THAT_DID_NOT_ARRIVE,
        )?.channelId,
    )
    const holedCells = Array.from(
      columns[holed].querySelectorAll<HTMLElement>(
        '[data-opens="program-panel"]',
      ),
    )
      .map((cell) => [cell.offsetTop, cell.offsetTop + cell.offsetHeight])
      .sort((a, b) => a[0] - b[0])

    await expect(holed).not.toBe(split)
    await expect(
      holedCells.some(
        ([top], index) => index > 0 && top > holedCells[index - 1][1],
      ),
    ).toBe(true)

    for (const [index, column] of columns.entries()) {
      if (index === split) {
        continue
      }

      await expect(
        column.querySelectorAll('[data-guide-unscheduled]'),
      ).toHaveLength(0)
    }
  },
}

/**
 * The line-up an aerial really hands over, on the same screen. There is no
 * width in which 27 columns are all readable at once, so they stop sharing:
 * each is drawn at the floor and the grid runs off the side, where the reader
 * can send it sideways. Every one of the 27 is at the floor, the services that
 * have split included, so the total is the count times the floor and nothing
 * else — which is what the line-up is held against here.
 *
 * Sideways is inside the grid. The page does not move — the top bar, the day
 * and the buttons stay where they were — and neither do the two things that
 * say where you are looking: the hour gutter stays against the left edge, and
 * the channel a column belongs to stays at the top of it however far along it
 * is. The vertical position the guide opens at is unaffected by any of it.
 */
export const 列が多ければ横に流れる: Story = {
  args: {
    guide: {
      ...day,
      channels: AERIAL_CHANNEL_FIXTURES,
      programs: AERIAL_PROGRAM_FIXTURES.map((program) => ({
        ...program,
        startMin: program.startMin + EVENING_MIN,
      })),
    },
  },
  decorators: [aScreenWide],
  play: async ({ canvasElement }) => {
    const scroller = partOf(canvasElement, '[data-guide-scroll]')
    const columns = Array.from(
      canvasElement.querySelectorAll<HTMLElement>('[data-guide-column]'),
    )
    const headings = Array.from(
      canvasElement.querySelectorAll<HTMLElement>('[data-guide-heading]'),
    )

    await expect(columns).toHaveLength(AERIAL_CHANNEL_FIXTURES.length)
    await expect(headings).toHaveLength(AERIAL_CHANNEL_FIXTURES.length)

    await expect(
      AERIAL_CHANNEL_FIXTURES.filter((channel) => channel.sub).length,
    ).toBeGreaterThan(0)

    for (const index of AERIAL_CHANNEL_FIXTURES.keys()) {
      await expect(widthOf(columns[index])).toBeCloseTo(COLUMN_MIN_PX, 0)
      await expect(widthOf(headings[index])).toBeCloseTo(
        widthOf(columns[index]),
        0,
      )
    }

    await expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth)
    await expect(scroller.scrollWidth).toBeCloseTo(
      gridMinWidthOf(AERIAL_CHANNEL_FIXTURES.length),
      0,
    )

    const page = partOf(canvasElement, 'main')
    await expect(page.scrollWidth).toBeLessThanOrEqual(page.clientWidth)

    const opened = scroller.scrollTop
    await expect(opened).toBeGreaterThan(0)

    scroller.scrollLeft = scroller.scrollWidth

    const grid = scroller.getBoundingClientRect()
    const end = columns.length - 1

    await expect(scroller.scrollLeft).toBeGreaterThan(0)
    await expect(scroller.scrollTop).toBe(opened)

    for (const gutter of canvasElement.querySelectorAll<HTMLElement>(
      '[data-guide-gutter]',
    )) {
      await expect(gutter.getBoundingClientRect().left).toBeCloseTo(
        grid.left,
        0,
      )
    }

    await expect(headings[end].getBoundingClientRect().left).toBeCloseTo(
      columns[end].getBoundingClientRect().left,
      0,
    )
    await expect(headings[end].getBoundingClientRect().top).toBeCloseTo(
      grid.top,
      0,
    )
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
