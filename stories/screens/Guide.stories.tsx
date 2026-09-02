import { useState } from 'react'
import type { Decorator, Meta, StoryObj } from '@storybook/nextjs'
import { getRouter } from '@storybook/nextjs/navigation.mock'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import { COLUMN_MIN_PX, gridMinWidthOf } from '@/lib/guide'
import {
  AERIAL_CHANNEL_FIXTURES,
  CHANNEL_FIXTURES,
} from '@/repository/channels.fixtures'
import { COLLECTION_FIXTURES } from '@/repository/collection.fixtures'
import type { Program } from '@/repository/programs'
import type { ReservationWrite } from '@/repository/reservations'
import {
  AERIAL_PROGRAM_FIXTURES,
  GUIDE_DAYS,
  NOW_LABEL,
  NOW_MIN,
  PROGRAM_FIXTURES,
} from '@/repository/programs.fixtures'
import { HOUR_PX } from '@/components/guide/guide-metrics'
import { AppFrame } from '@/components/vela/app-shell'
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
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true, navigation: { pathname: '/guide' } },
  },
  args: {
    collection: COLLECTION_FIXTURES,
    onCollectNow: async () => ({ state: 'started' as const, streams: 7 }),
    onRebuild: async () => ({ state: 'ok' as const, discarded: 3521 }),
    onReserve: async (): Promise<ReservationWrite> => ({ state: 'ok' }),
    onCancel: async (): Promise<ReservationWrite> => ({ state: 'ok' }),
    onRevise: async (): Promise<ReservationWrite> => ({ state: 'ok' }),
  },
  decorators: [
    (Story) => (
      <AppFrame>
        <Story />
      </AppFrame>
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
          className="tap-target fixed bottom-1 left-1 z-50 cursor-pointer rounded-full border border-edge bg-surface px-3 py-1 text-sub"
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

/** A whole day of the line-up an aerial really hands over: 27 services. */
const aerial = {
  ...day,
  channels: AERIAL_CHANNEL_FIXTURES,
  programs: AERIAL_PROGRAM_FIXTURES.map((program) => ({
    ...program,
    startMin: program.startMin + EVENING_MIN,
  })),
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
 * A split service back on the whole service's programme for half an hour
 * between two of its own, which is an ordinary way for one to run.
 *
 * The band is 48px and its name, set down the page, is longer than that. Given
 * the name anyway it would lose a slice off each end at once — the label is
 * centred and the band clips — and half a 編 above a half a し reads as a
 * fault in the drawing. So a run too short to be named is left to the dashed
 * rules at its ends, the way a cell too short for its description is left to
 * its title.
 */
const A_SHORT_RETURN = [
  {
    id: 'q001',
    channelId: 'ch-152',
    title: '夕方の実況',
    genre: 'sports' as const,
    genreLabel: 'スポーツ',
    startMin: 0,
    durationMin: 60,
    startLabel: '19:00',
    endLabel: '20:00',
  },
  {
    id: 'q002',
    channelId: 'ch-152',
    title: '第二試合',
    genre: 'sports' as const,
    genreLabel: 'スポーツ',
    startMin: 90,
    durationMin: 60,
    startLabel: '20:30',
    endLabel: '21:30',
  },
  {
    id: 'q003',
    channelId: 'ch-152',
    title: '深夜の再放送',
    genre: 'doc' as const,
    genreLabel: 'ドキュメンタリー/教養',
    startMin: 240,
    durationMin: 240,
    startLabel: '23:00',
    endLabel: '03:00',
  },
]

export const 編成なしの短い帯は名前を落とす: Story = {
  args: {
    guide: {
      ...base,
      channels: SERVICES_ONE_OF_THEM_SPLIT,
      programs: A_SHORT_RETURN,
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

    await expect(bands).toHaveLength(2)

    const [brief, long] = bands

    await expect(brief.offsetHeight).toBeCloseTo(HOUR_PX / 2, 0)
    await expect(brief.querySelector('span')).toBeNull()
    await expect(long.offsetHeight).toBeCloseTo(HOUR_PX * 1.5, 0)
    await expect(long).toHaveTextContent('編成なし')
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
 * That the sideways is inside the grid, and that nothing else moves with it,
 * is asked of every width it has to hold at — here and at the two an iPad is
 * read at — so it is asked in one place.
 */
export const 列が多ければ横に流れる: Story = {
  args: { guide: aerial },
  decorators: [aScreenWide],
  play: async ({ canvasElement }) => {
    const scroller = partOf(canvasElement, '[data-guide-scroll]')
    const columns = Array.from(
      canvasElement.querySelectorAll<HTMLElement>('[data-guide-column]'),
    )
    const headings = Array.from(
      canvasElement.querySelectorAll<HTMLElement>('[data-guide-heading]'),
    )

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

    await expect(scroller.scrollWidth).toBeCloseTo(
      gridMinWidthOf(AERIAL_CHANNEL_FIXTURES.length),
      0,
    )

    await sidewaysInsideTheGrid(canvasElement)
  },
}

export const 健全性バナー: Story = {
  args: {
    guide: {
      ...base,
      coverageWarning: {
        emphasis: '湾岸放送1 の番組情報が不足しています。',
      },
    },
  },
}

/**
 * A day the present is not in. There is no line to open half an hour above, so
 * the guide opens where the broadcast day does — and the way back to today is
 * offered, which is a thing only a day that is not today has to offer. It asks
 * for the guide with no day on it rather than for today by date: today is
 * whichever day it is when the address is opened, not the one it was when the
 * button was drawn.
 *
 * It is the last day the guide holds, so there is no day after it to page to.
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
    const canvas = within(canvasElement)
    const scroller = partOf(canvasElement, '[data-guide-scroll]')
    const router = getRouter()

    await expect(canvasElement.querySelector('[data-now-line]')).toBeNull()
    await expect(scroller.scrollTop).toBe(0)
    await expect(canvas.getByRole('button', { name: '次の日' })).toBeDisabled()

    await userEvent.click(canvas.getByRole('button', { name: '今日' }))

    await expect(router.replace).toHaveBeenCalledWith('/guide', {
      scroll: false,
    })
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

/**
 * The first cell the grid is showing whole, and the programme it was drawn
 * from. A cell half off the edge is no use for pressing: the browser brings
 * what it focuses into view, and a scroll the browser did would be read here
 * as a scroll the guide did.
 */
function onScreenCells(
  canvasElement: HTMLElement,
  scroller: HTMLElement,
): { cell: HTMLElement; program: Program }[] {
  const view = scroller.getBoundingClientRect()
  const cells = Array.from(
    canvasElement.querySelectorAll<HTMLElement>('[data-opens="program-panel"]'),
  )

  return cells
    .map((cell, index) => ({ cell, program: IN_GRID_ORDER[index] }))
    .filter(({ cell }) => {
      const at = cell.getBoundingClientRect()

      return (
        at.height > 0 &&
        at.top >= view.top &&
        at.bottom <= view.bottom &&
        at.left >= view.left &&
        at.right <= view.right
      )
    })
}

function onScreenIn(
  canvasElement: HTMLElement,
  scroller: HTMLElement,
): { cell: HTMLElement; program: Program } {
  const [first] = onScreenCells(canvasElement, scroller)

  if (!first) {
    throw new Error('the guide is showing no programme whole')
  }

  return first
}

/**
 * What the surface is drawn showing for the programme it was opened from: the
 * hour, the genre, whatever the broadcaster wrote, and every extended section
 * that programme carries. Reading it here rather than reading a way to go and
 * find it, because there is no longer a way — pressing a cell in the guide
 * puts the whole of the programme on the layer, and never sends the reader off
 * the guide to its own page.
 *
 * The absence is claimed alongside the reading, never on its own: a run where
 * nothing opened satisfies "no link to the page" without opening anything.
 */
async function readsInFull(
  surface: HTMLElement,
  program: Program,
): Promise<void> {
  const shown = within(surface)
  const detail = surface.querySelector<HTMLElement>('[data-program-detail]')

  await expect(detail).not.toBeNull()

  const reading = (detail!.textContent ?? '').replace(/\s+/g, ' ').trim()

  await expect(
    shown.getByRole('heading', { name: program.title }),
  ).toBeVisible()
  await expect(reading).toContain(program.genreLabel)
  await expect(reading).toContain(program.startLabel)

  if (program.description) {
    await expect(reading).toContain(
      program.description.replace(/\s+/g, ' ').trim(),
    )
  }

  for (const item of program.items ?? []) {
    await expect(
      shown.getByRole('heading', { name: item.heading }),
    ).toBeVisible()
    await expect(reading).toContain(item.text.replace(/\s+/g, ' ').trim())
  }

  await expect(
    surface.querySelector(`a[href="/guide/programs/${program.id}"]`),
  ).toBeNull()
}

/** The surface a programme opens onto, once it is up and holding focus. */
async function openedPanel(canvasElement: HTMLElement): Promise<HTMLElement> {
  const doc = canvasElement.ownerDocument

  return waitFor(() => {
    const surface = doc.querySelector<HTMLElement>(
      '[data-slot="dialog-content"]',
    )

    if (surface === null) {
      throw new Error('no programme is open')
    }

    if (!surface.contains(doc.activeElement)) {
      throw new Error('the surface does not hold focus')
    }

    return surface
  })
}

/** The layer the surface lays over the guide, and where a press outside lands. */
const overlayOver = (canvasElement: HTMLElement): Element | null =>
  canvasElement.ownerDocument.querySelector('[data-slot="dialog-overlay"]')

const middleOf = (element: Element): [number, number] => {
  const at = element.getBoundingClientRect()

  return [at.left + at.width / 2, at.top + at.height / 2]
}

/**
 * Reading a programme does not cost the place in the guide it was read from.
 * The panel is a layer over the grid, not a page in front of it, so the hour
 * the reader had scrolled to is still the hour on screen behind it — an hour
 * they scrolled to themselves, away from where the guide opened, because a
 * grid put back where it opens would be indistinguishable from one left alone
 * if the two were the same place.
 *
 * The panel is also the whole of the reading: what used to be a way through to
 * a separate page is the page's own content, drawn on the layer.
 */
export const 番組を開いても場所は動かない: Story = {
  args: { guide: day },
  decorators: [shorterThanADay],
  play: async ({ canvasElement }) => {
    const scroller = partOf(canvasElement, '[data-guide-scroll]')

    await expect(scroller.scrollTop).toBeGreaterThan(HOUR_PX)

    scroller.scrollTop -= HOUR_PX

    const wasAt = scroller.scrollTop
    const wasAcross = scroller.scrollLeft
    const { cell, program } = onScreenIn(canvasElement, scroller)

    await userEvent.click(cell)

    const panel = await openedPanel(canvasElement)

    await expect(scroller.scrollTop).toBe(wasAt)
    await expect(scroller.scrollLeft).toBe(wasAcross)
    await readsInFull(panel, program)
  },
}

/**
 * A programme is read on a layer over the guide, and the grid underneath is out
 * of reach while it is up. A press on a cell is a press outside, so what it
 * does is shut what is open — the programme it landed on is opened by the press
 * after that, not by the one that closed.
 *
 * Which is the difference from the surface that stood here before: that one
 * swapped the new programme in under the reader, so a press meant to put the
 * reading down changed what was being read instead.
 *
 * Both halves are asked for. A run where nothing ever opened would satisfy the
 * shutting on its own, so the surface is read for the programme it was opened
 * from first; and a run where the presses landed nowhere would satisfy it too,
 * so the second press has to open the programme the first one was aimed at.
 */
export const 別の番組を押すとまず閉じる: Story = {
  args: { guide: day },
  decorators: [shorterThanADay],
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument
    const scroller = partOf(canvasElement, '[data-guide-scroll]')
    const showing = onScreenCells(canvasElement, scroller)

    await expect(showing.length).toBeGreaterThan(1)

    const [read, next] = showing

    await expect(next.program.id).not.toBe(read.program.id)

    await userEvent.click(read.cell)

    await readsInFull(await openedPanel(canvasElement), read.program)

    const [across, down] = middleOf(next.cell)

    await expect(doc.elementFromPoint(across, down)).toBe(
      overlayOver(canvasElement),
    )

    await userEvent.click(overlayOver(canvasElement) as HTMLElement)

    await waitFor(() =>
      expect(doc.querySelector('[data-slot="dialog-content"]')).toBeNull(),
    )
    await expect(next.cell).toHaveAttribute('aria-pressed', 'false')

    await waitFor(() =>
      expect(next.cell.contains(doc.elementFromPoint(across, down))).toBe(true),
    )
    await userEvent.click(next.cell)

    await readsInFull(await openedPanel(canvasElement), next.program)
  },
}

/**
 * A programme the broadcaster sent more about than a synopsis, opened from the
 * grid. Every extended section it carries is on the layer, and the listing it
 * is tied to is reachable at that listing's own address — the one address a
 * programme still opens a page from. Its own is not among them.
 */
export const 番組の詳細が層の中に出る: Story = {
  args: { guide: base },
  play: async ({ canvasElement }) => {
    const carries = PROGRAM_FIXTURES.filter(
      (program) => (program.items ?? []).length > 0,
    )

    await expect(carries.length).toBeGreaterThan(0)

    const cells = Array.from(
      canvasElement.querySelectorAll<HTMLElement>(
        '[data-opens="program-panel"]',
      ),
    )

    for (const program of carries) {
      const at = IN_GRID_ORDER.findIndex((one) => one.id === program.id)

      await expect(at).toBeGreaterThanOrEqual(0)

      const cell = cells[at]

      cell.scrollIntoView({ block: 'center' })

      await userEvent.click(cell)

      const surface = await openedPanel(canvasElement)

      await readsInFull(surface, program)

      for (const other of program.related ?? []) {
        await expect(
          surface.querySelector(`a[href="/guide/programs/${other.key}"]`),
        ).not.toBeNull()
      }

      await userEvent.keyboard('{Escape}')
      await waitFor(() =>
        expect(
          canvasElement.ownerDocument.querySelector(
            '[data-slot="dialog-content"]',
          ),
        ).toBeNull(),
      )
    }
  },
}

/**
 * Paging the guide a day at a time. The day is state a second reader opening
 * the link has to arrive at, so what a pager press does is ask for an address
 * — and the ends of the window are ends: there is no day before the first one
 * the guide holds to page back to.
 */
export const 日を送る: Story = {
  args: { guide: base },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const router = getRouter()

    await expect(canvas.queryByRole('button', { name: '今日' })).toBeNull()

    await userEvent.click(canvas.getByRole('button', { name: '次の日' }))

    await expect(router.replace).toHaveBeenCalledWith(
      `/guide?date=${GUIDE_DAYS[2].date}`,
      { scroll: false },
    )

    await userEvent.click(canvas.getByRole('button', { name: '前の日' }))

    await expect(router.replace).toHaveBeenCalledWith(
      `/guide?date=${GUIDE_DAYS[0].date}`,
      { scroll: false },
    )
  },
}

/**
 * The two sizes an iPad is read at, portrait and landscape. The browser itself
 * is put at them rather than a box inside it: what the screen does at a width
 * is decided by media queries against the viewport, so a 768px box in a
 * desktop-wide window lays out as the desktop and would answer for the iPad
 * without ever having been one. `.storybook/test-runner.ts` moves the viewport
 * for a story that asks.
 */
const AN_IPAD = { width: 768, height: 1024 }

const AN_IPAD_TURNED = { width: 1024, height: 768 }

/**
 * What a width too narrow for the line-up does to the screen. The grid runs
 * off its own right edge and is sent sideways from inside; the page does not
 * move, so the toolbar, the day and the buttons stay where they were. The two
 * things that say where you are looking stay too — the hour gutter against
 * the left edge and the channel at the top of its column — and how far down
 * the day the reader is is not touched by how far along it they are.
 */
async function sidewaysInsideTheGrid(
  canvasElement: HTMLElement,
): Promise<void> {
  const scroller = partOf(canvasElement, '[data-guide-scroll]')
  const page = partOf(canvasElement, 'main')
  const columns = Array.from(
    canvasElement.querySelectorAll<HTMLElement>('[data-guide-column]'),
  )
  const headings = Array.from(
    canvasElement.querySelectorAll<HTMLElement>('[data-guide-heading]'),
  )

  await expect(columns).toHaveLength(AERIAL_CHANNEL_FIXTURES.length)
  await expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth)
  await expect(page.scrollWidth).toBeLessThanOrEqual(page.clientWidth)

  const down = scroller.scrollTop

  await expect(down).toBeGreaterThan(0)

  scroller.scrollLeft = scroller.scrollWidth

  await expect(scroller.scrollLeft).toBeGreaterThan(0)
  await expect(scroller.scrollTop).toBe(down)
  await expect(page.scrollWidth).toBeLessThanOrEqual(page.clientWidth)

  const grid = scroller.getBoundingClientRect()
  const end = columns.length - 1

  for (const gutter of canvasElement.querySelectorAll<HTMLElement>(
    '[data-guide-gutter]',
  )) {
    await expect(gutter.getBoundingClientRect().left).toBeCloseTo(grid.left, 0)
  }

  await expect(headings[end].getBoundingClientRect().left).toBeCloseTo(
    columns[end].getBoundingClientRect().left,
    0,
  )
  await expect(headings[end].getBoundingClientRect().top).toBeCloseTo(
    grid.top,
    0,
  )
}

export const iPadの幅: Story = {
  args: { guide: aerial },
  parameters: { screen: AN_IPAD },
  play: async ({ canvasElement }) => {
    await sidewaysInsideTheGrid(canvasElement)
  },
}

export const iPadを横にした幅: Story = {
  args: { guide: aerial },
  parameters: { screen: AN_IPAD_TURNED },
  play: async ({ canvasElement }) => {
    await sidewaysInsideTheGrid(canvasElement)
  },
}
