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
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true, navigation: { pathname: '/guide' } },
  },
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
        body: 'EPG の収集が連続して揃っていません。',
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
function onScreenIn(
  canvasElement: HTMLElement,
  scroller: HTMLElement,
): { cell: HTMLElement; program: Program } {
  const view = scroller.getBoundingClientRect()
  const cells = Array.from(
    canvasElement.querySelectorAll<HTMLElement>('[data-opens="program-panel"]'),
  )
  const index = cells.findIndex((cell) => {
    const at = cell.getBoundingClientRect()

    return (
      at.height > 0 &&
      at.top >= view.top &&
      at.bottom <= view.bottom &&
      at.left >= view.left &&
      at.right <= view.right
    )
  })

  if (index < 0) {
    throw new Error('the guide is showing no programme whole')
  }

  return { cell: cells[index], program: IN_GRID_ORDER[index] }
}

/** The panel, once it is open rather than merely rendered closed. */
async function openedPanel(canvasElement: HTMLElement): Promise<HTMLElement> {
  return waitFor(() => {
    const panel = partOf(canvasElement, 'aside')

    if (panel.getAttribute('aria-hidden') !== 'false') {
      throw new Error('the panel is not open')
    }

    return panel
  })
}

/**
 * Reading a programme does not cost the place in the guide it was read from.
 * The panel is a layer over the grid, not a page in front of it, so the hour
 * the reader had scrolled to is still the hour on screen behind it — an hour
 * they scrolled to themselves, away from where the guide opened, because a
 * grid put back where it opens would be indistinguishable from one left alone
 * if the two were the same place.
 *
 * The panel is also where the programme's own address is: `/guide/programs/`
 * and the identifier of the programme that was pressed, so what is opened
 * standalone is that programme rather than whatever the grid was showing.
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

    const panel = within(await openedPanel(canvasElement))

    await expect(scroller.scrollTop).toBe(wasAt)
    await expect(scroller.scrollLeft).toBe(wasAcross)
    await expect(
      panel.getByRole('heading', { name: program.title }),
    ).toBeVisible()
    await expect(
      panel.getByRole('link', { name: '番組詳細を開く' }),
    ).toHaveAttribute('href', `/guide/programs/${program.id}`)
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
