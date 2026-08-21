import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect } from 'storybook/test'

import { CHANNEL_FIXTURES } from '@/repository/channels.fixtures'
import { COLLECTION_FIXTURES } from '@/repository/collection.fixtures'
import {
  GUIDE_DAYS,
  NOW_LABEL,
  NOW_MIN,
  PROGRAM_FIXTURES,
} from '@/repository/programs.fixtures'
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

export const 別の日: Story = {
  args: {
    guide: {
      ...base,
      day: GUIDE_DAYS[2],
      nowMin: undefined,
      nowLabel: undefined,
    },
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
