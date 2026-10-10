import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, within } from 'storybook/test'

import {
  LEARNING_DATA,
  LEARNING_DATA_WAITING,
  NO_LEARNING_DATA,
  SEGMENT_STATUS_UNREAD,
} from '@/repository/segment-status.fixtures'
import { SegmentsView } from '@/components/segments/segments-page'
import { afterTheArrival } from '@/stories/after-the-arrival'
import { inTheSettings } from '@/stories/frames'
import { groundOf } from '@/stories/ground-of'

const meta = {
  title: 'Screens/設定・CM・OP・ED',
  component: SegmentsView,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/settings/segments' },
    },
    layout: 'fullscreen',
  },
  decorators: [inTheSettings],
} satisfies Meta<typeof SegmentsView>

export default meta
type Story = StoryObj<typeof meta>

function thePanel(canvasElement: HTMLElement): HTMLElement {
  const panel = canvasElement.querySelector<HTMLElement>(
    '[data-slot="learning-data"]',
  )

  if (!panel) {
    throw new Error('the learning data panel is not drawn')
  }

  return panel
}

async function rowsAre(
  canvasElement: HTMLElement,
  rows: [string, string][],
): Promise<void> {
  await afterTheArrival(canvasElement)

  const canvas = within(canvasElement)
  const panel = thePanel(canvasElement)

  await expect(
    canvas.getByRole('heading', { level: 1, name: 'CM・OP・ED' }),
  ).toBeVisible()
  await expect(
    canvas.getByRole('heading', { level: 2, name: '学習に使うデータ' }),
  ).toBeVisible()
  await expect(
    canvas.getByRole('link', { name: 'CM・OP・ED' }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(getComputedStyle(panel).backgroundColor).toBe(
    groundOf(canvasElement, 'bg-surface'),
  )
  await expect(
    [...panel.querySelectorAll('dt')].map((one) => one.textContent),
  ).toEqual(rows.map(([name]) => name))
  await expect(
    [...panel.querySelectorAll('dd')].map((one) => one.textContent),
  ).toEqual(rows.map(([, value]) => value))
}

export const データなし: Story = {
  args: { status: NO_LEARNING_DATA },
  play: async ({ canvasElement }) => {
    await rowsAre(canvasElement, [
      ['データのある録画', '0 件'],
      ['時間', '0 時間'],
      ['大きさ', '0 B'],
    ])
  },
}

export const データあり: Story = {
  args: { status: LEARNING_DATA },
  play: async ({ canvasElement }) => {
    await rowsAre(canvasElement, [
      ['データのある録画', '312 件'],
      ['時間', '187 時間'],
      ['大きさ', '4.3 GB'],
    ])
  },
}

export const 取り出し待ちあり: Story = {
  args: { status: LEARNING_DATA_WAITING },
  play: async ({ canvasElement }) => {
    await rowsAre(canvasElement, [
      ['データのある録画', '312 件'],
      ['時間', '187 時間'],
      ['大きさ', '4.3 GB'],
      ['取り出し待ち', '12 件'],
    ])
  },
}

export const 読めない: Story = {
  args: { status: SEGMENT_STATUS_UNREAD },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)

    const panel = thePanel(canvasElement)

    await expect(
      within(canvasElement).getByRole('heading', {
        level: 2,
        name: '学習に使うデータ',
      }),
    ).toBeVisible()
    await expect(getComputedStyle(panel).backgroundColor).toBe(
      groundOf(canvasElement, 'bg-surface-2'),
    )
    await expect(panel).toHaveTextContent('状態不明')
    await expect(panel.querySelector('dl')).toBeNull()
  },
}
