import { useState } from 'react'
import type { Decorator, Meta, StoryObj } from '@storybook/nextjs'
import { getRouter } from '@storybook/nextjs/navigation.mock'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import { COLUMN_MIN_PX, gridMinWidthOf, isOnAir } from '@/lib/guide'
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
import { SUB_CHANNELS_FOLDED_KEY } from '@/hooks/useSubChannelsFolded'
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
  beforeEach: () => {
    try {
      window.localStorage.removeItem(SUB_CHANNELS_FOLDED_KEY)
    } catch (error) {
      console.warn('[Guide.stories] the fold could not be cleared', error)
    }
  },
} satisfies Meta<typeof GuideView>

export default meta
type Story = StoryObj<typeof meta>

const IN_GRID_ORDER = CHANNEL_FIXTURES.flatMap((channel) =>
  PROGRAM_FIXTURES.filter((program) => program.channelId === channel.id),
)

export const 通常: Story = {
  args: { guide: base },
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

const A_WHILE_MIN = 6

function clockAt(windowStartHour: number, min: number): string {
  const at = windowStartHour * 60 + min

  return `${String(Math.floor(at / 60) % 24).padStart(2, '0')}:${String(at % 60).padStart(2, '0')}`
}

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

const aScreenWide: Decorator = (Story) => (
  <div className="flex h-[720px] w-[1400px] flex-col overflow-hidden">
    <Story />
  </div>
)

const FEW_SERVICES = CHANNEL_FIXTURES.filter((channel) => !channel.sub).slice(
  0,
  4,
)

function widthOf(part: HTMLElement): number {
  return part.getBoundingClientRect().width
}

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

const SERVICES_ONE_OF_THEM_SPLIT = CHANNEL_FIXTURES.slice(0, 4)

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

const aerial = {
  ...day,
  channels: AERIAL_CHANNEL_FIXTURES,
  programs: AERIAL_PROGRAM_FIXTURES.map((program) => ({
    ...program,
    startMin: program.startMin + EVENING_MIN,
  })),
}

const UNSCHEDULED = [
  { startMin: 120, durationMin: 90 },
  { startMin: 270, durationMin: 150 },
]

const A_LISTING_THAT_DID_NOT_ARRIVE = 'p014'

const SPLIT_LINE_UP = PROGRAM_FIXTURES.filter(
  (program) =>
    SERVICES_ONE_OF_THEM_SPLIT.some(
      (channel) => channel.id === program.channelId,
    ) && program.id !== A_LISTING_THAT_DID_NOT_ARRIVE,
)

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
        tone: 'warn',
        emphasis: '3 チャンネルの番組情報が 8 日先まで届いていません。',
      },
    },
  },
}

export const 一度も取れていないバナー: Story = {
  args: {
    guide: {
      ...base,
      coverageWarning: {
        tone: 'danger',
        emphasis: '2 チャンネルの番組情報がまだ一度も取れていません。',
        detail: 'ほかに 1 チャンネルが 8 日先まで届いていません。',
      },
    },
  },
}

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

const overlayOver = (canvasElement: HTMLElement): Element | null =>
  canvasElement.ownerDocument.querySelector('[data-slot="dialog-overlay"]')

const middleOf = (element: Element): [number, number] => {
  const at = element.getBoundingClientRect()

  return [at.left + at.width / 2, at.top + at.height / 2]
}

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

export const 放送中の番組からライブへ: Story = {
  args: { guide: base },
  play: async ({ canvasElement }) => {
    const cells = Array.from(
      canvasElement.querySelectorAll<HTMLElement>(
        '[data-opens="program-panel"]',
      ),
    )
    const onAir = IN_GRID_ORDER.find((program) => isOnAir(program, NOW_MIN))
    const later = IN_GRID_ORDER.find(
      (program) => program.startMin > NOW_MIN + 60,
    )

    await expect(onAir).toBeDefined()
    await expect(later).toBeDefined()

    const open = async (program: Program) => {
      const cell = cells[IN_GRID_ORDER.indexOf(program)]

      cell.scrollIntoView({ block: 'center' })
      await userEvent.click(cell)

      return openedPanel(canvasElement)
    }

    const close = async () => {
      await userEvent.keyboard('{Escape}')
      await waitFor(() =>
        expect(
          canvasElement.ownerDocument.querySelector(
            '[data-slot="dialog-content"]',
          ),
        ).toBeNull(),
      )
    }

    const now = await open(onAir!)

    await expect(
      within(now).getByRole('link', { name: 'ライブ視聴' }),
    ).toHaveAttribute('href', `/live?ch=${onAir!.channelId}`)
    await close()

    const soon = await open(later!)

    await expect(
      within(soon).queryByRole('link', { name: 'ライブ視聴' }),
    ).toBeNull()
    await close()
  },
}

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

const AN_IPAD = { width: 768, height: 1024 }

const AN_IPAD_TURNED = { width: 1024, height: 768 }

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

const A_STATION_AND_ITS_SPLITS = [
  CHANNEL_FIXTURES[0],
  CHANNEL_FIXTURES[1],
  {
    id: 'ch-153',
    no: '153',
    name: 'みなと総合3',
    kind: 'terrestrial' as const,
    sub: true,
    whole: 'ch-151',
  },
  CHANNEL_FIXTURES[2],
]

const STATION = A_STATION_AND_ITS_SPLITS[0]
const SPLIT_WITH_ITS_OWN = A_STATION_AND_ITS_SPLITS[1]
const SPLIT_REPEATING_IT = A_STATION_AND_ITS_SPLITS[2]

const drawnOn = (channelId: string) =>
  PROGRAM_FIXTURES.filter((program) => program.channelId === channelId)

const repeatedOnto = (channelId: string, from: Program[]) =>
  from.map((program) => ({ ...program, channelId }))

const BETWEEN_ITS_OWN = drawnOn(STATION.id).filter((program) =>
  drawnOn(SPLIT_WITH_ITS_OWN.id).every(
    (mine) =>
      program.startMin + program.durationMin <= mine.startMin ||
      mine.startMin + mine.durationMin <= program.startMin,
  ),
)

const A_STATION_AS_IT_GOES_OUT = [
  ...drawnOn(STATION.id),
  ...drawnOn(SPLIT_WITH_ITS_OWN.id),
  ...repeatedOnto(SPLIT_WITH_ITS_OWN.id, BETWEEN_ITS_OWN),
  ...repeatedOnto(SPLIT_REPEATING_IT.id, drawnOn(STATION.id)),
  ...drawnOn(A_STATION_AND_ITS_SPLITS[3].id),
]

const SPLIT_LINE_UP_GUIDE = {
  ...base,
  channels: A_STATION_AND_ITS_SPLITS,
  programs: A_STATION_AS_IT_GOES_OUT,
}

function columnsOf(canvasElement: HTMLElement): string[] {
  return Array.from(
    canvasElement.querySelectorAll<HTMLElement>('[data-guide-heading]'),
  ).map((heading) => heading.textContent ?? '')
}

export const 副チャンネルを出している: Story = {
  args: { guide: SPLIT_LINE_UP_GUIDE },
  decorators: [aScreenWide],
  play: async ({ canvasElement }) => {
    const columns = columnsOf(canvasElement)

    await expect(columns).toHaveLength(A_STATION_AND_ITS_SPLITS.length)
    await expect(columns.join(' ')).toContain(SPLIT_REPEATING_IT.name)

    const press = within(canvasElement).getByRole('button', {
      name: '副チャンネル',
    })

    await expect(press).toHaveAttribute('aria-pressed', 'true')
  },
}

export const 副チャンネルを畳んでいる: Story = {
  args: { guide: SPLIT_LINE_UP_GUIDE },
  decorators: [aScreenWide],
  play: async ({ canvasElement }) => {
    const press = within(canvasElement).getByRole('button', {
      name: '副チャンネル',
    })

    await userEvent.click(press)
    await expect(press).toHaveAttribute('aria-pressed', 'false')

    const columns = columnsOf(canvasElement)

    await expect(columns.join(' ')).not.toContain(SPLIT_REPEATING_IT.name)
    await expect(columns.join(' ')).toContain(SPLIT_WITH_ITS_OWN.name)
    await expect(columns).toHaveLength(A_STATION_AND_ITS_SPLITS.length - 1)

    const kept = Array.from(
      canvasElement.querySelectorAll<HTMLElement>('[data-guide-column]'),
    )[columns.findIndex((one) => one.includes(SPLIT_WITH_ITS_OWN.name))]
    const cells = Array.from(
      kept.querySelectorAll<HTMLElement>('[data-opens="program-panel"]'),
    )

    await expect(cells).toHaveLength(drawnOn(SPLIT_WITH_ITS_OWN.id).length)

    for (const mine of drawnOn(SPLIT_WITH_ITS_OWN.id)) {
      await expect(kept).toHaveTextContent(mine.title)
    }

    await expect(
      kept.querySelectorAll('[data-guide-unscheduled]').length,
    ).toBeGreaterThan(0)
  },
}

export const 畳む先が無ければ操作子を出さない: Story = {
  args: {
    guide: {
      ...base,
      channels: A_STATION_AND_ITS_SPLITS.slice(0, 2),
      programs: [...drawnOn(STATION.id), ...drawnOn(SPLIT_WITH_ITS_OWN.id)],
    },
  },
  decorators: [aScreenWide],
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).queryByRole('button', { name: '副チャンネル' }),
    ).toBeNull()
  },
}
