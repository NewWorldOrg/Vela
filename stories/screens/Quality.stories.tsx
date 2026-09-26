import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'

import {
  A_WEEK,
  EVERY_ROW_UNMEASURED,
  MORE_TUNERS_THAN_FIT,
  NOTHING_MEASURED,
  ONE_RECORDING_IN_A_DAY,
  OVER_THE_LINE,
  QUALITY,
  TWO_BROADCAST_DAYS,
} from '@/repository/quality.fixtures'
import type { QualityReviseThreshold } from '@/components/quality/quality-page'
import { QualityView } from '@/components/quality/quality-page'
import {
  rowsOfTheTableHeaded,
  saysItWithoutAnEdge,
} from '@/stories/pills-in-a-column'
import { scrollsInsideWithItsHeaderHeld } from '@/stories/scrolls-inside'
import { inTheSettings } from '@/stories/frames'

const REFUSED =
  '警告水準が視聴不可の恐れを越えてしまうため、変更できませんでした。'

const reviseThreshold = fn<QualityReviseThreshold>(async () => ({
  state: 'ok',
}))

const refusesTheThreshold = fn<QualityReviseThreshold>(async () => ({
  state: 'rejected',
  message: REFUSED,
}))

const meta = {
  title: 'Screens/設定・品質',
  component: QualityView,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/settings/quality' },
    },
    layout: 'fullscreen',
  },
  args: { onReviseThreshold: reviseThreshold },
  decorators: [inTheSettings],
} satisfies Meta<typeof QualityView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = { args: { result: QUALITY } }

export const 何も計測されていない: Story = {
  args: { result: NOTHING_MEASURED },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByText('解消していない異常はありません。'),
    ).toBeVisible()
    await expect(
      canvas.getByText('期間内に地上波の録画がありません。'),
    ).toBeVisible()
    await expect(
      canvas.getByText('期間内に BS / CS の録画がありません。'),
    ).toBeVisible()
    await expect(
      canvas.getByText('期間内に録画したチューナーがありません。'),
    ).toBeVisible()

    const spots = [
      ...canvasElement.querySelectorAll('[data-slot="empty-state"] svg'),
    ].map((one) => one.innerHTML)

    await expect(spots.length).toBe(3)
    await expect(new Set(spots).size).toBe(spots.length)
  },
}

export const 移行直後で全面未計測: Story = {
  args: { result: EVERY_ROW_UNMEASURED },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    for (const label of [
      '直近 24 時間のドロップ率',
      '問題のある録画',
      'スクランブル残存率',
      'チューナーヘルス',
    ]) {
      const tile = canvas
        .getAllByText(label)
        .find((one) => one.closest('[data-slot="section-heading"]') === null)

      await expect(tile?.closest('[data-slot="surface"]')).toHaveTextContent(
        '未計測',
      )
    }

    await expect(canvas.queryByText('良好')).toBeNull()
    await expect(canvas.queryByText('警告水準')).toBeNull()
    await expect(canvas.queryByText('0')).toBeNull()

    const meters = [...canvasElement.querySelectorAll('[data-slot="meter"]')]

    await expect(meters.length).toBe(6)
    await expect(
      meters.every((one) => one.getAttribute('data-level') === 'unmeasured'),
    ).toBe(true)
    await expect(
      canvasElement.querySelectorAll('[data-slot="meter-fill"]').length,
    ).toBe(0)

    await expect(canvas.getAllByRole('row').length).toBe(5)
    await expect(
      canvas.queryByText('期間内に録画したチューナーがありません。'),
    ).toBeNull()

    const whole = canvas.getByRole('img', { name: '全体の推移' })

    await expect(whole.querySelector('[data-level="good"]')).toBeNull()
    await expect(
      whole.querySelectorAll('[data-level="unmeasured"]').length,
    ).toBe(24)
  },
}

export const 一部だけ未計測: Story = {
  args: { result: QUALITY },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('計測の供給が途絶しています')).toBeVisible()
    await expect(canvas.getByText('録画 11 本を計測')).toBeVisible()
    await expect(canvas.getAllByText('良好').length).toBeGreaterThan(0)
    await expect(canvas.getAllByText('未計測').length).toBeGreaterThan(0)
    await expect(
      canvasElement.querySelectorAll('[data-slot="meter-fill"]').length,
    ).toBeGreaterThan(0)
  },
}

export const 閾値を変更: Story = {
  args: { result: QUALITY },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '閾値を変更' }))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: '閾値を変更' })).toBeVisible(),
    )
  },
}

export const 閾値の変更を断られる: Story = {
  args: { result: QUALITY, onReviseThreshold: refusesTheThreshold },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '閾値を変更' }))

    const dialog = await screen.findByRole('dialog', { name: '閾値を変更' })

    await userEvent.click(
      within(dialog).getByRole('button', { name: '変更する' }),
    )
    await waitFor(() => expect(within(dialog).getByText(REFUSED)).toBeVisible())
  },
}

export const 収まらないほどのチューナー: Story = {
  args: { result: MORE_TUNERS_THAN_FIT },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, 'チューナー')
  },
}

export const 狭い幅で収まらないほどのチューナー: Story = {
  args: { result: MORE_TUNERS_THAN_FIT },
  parameters: { screen: { width: 768, height: 1024 } },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, 'チューナー')
  },
}

export const 推移: Story = {
  args: { result: QUALITY },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const subjects = canvas.getByRole('group', { name: '対象' })

    await expect(
      within(subjects).getByRole('link', { name: 'CNR' }),
    ).toHaveAttribute('aria-current', 'page')
    await expect(
      canvas.getByRole('img', { name: '全体の推移' }),
    ).toBeInTheDocument()

    const quiet = canvas.getByRole('img', { name: 'みなと教育1の推移' })

    await expect(quiet.querySelector('[data-level="good"]')).toBeNull()
    await expect(quiet.querySelectorAll('[data-level="nodata"]').length).toBe(
      24,
    )
  },
}

const trendPanel = (canvasElement: HTMLElement) =>
  canvasElement
    .querySelector('[aria-label="全体の推移"]')
    ?.closest<HTMLElement>('[data-slot="surface"]') ?? canvasElement

const middleOf = (element: Element) => {
  const box = element.getBoundingClientRect()

  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

export const 録画が1本だけの24時間: Story = {
  args: { result: ONE_RECORDING_IN_A_DAY },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const whole = canvas.getByRole('img', { name: '全体の推移' })

    await expect(whole.querySelectorAll('[data-slot="step"]').length).toBe(2)
    await expect(whole.querySelectorAll('[data-slot="riser"]').length).toBe(1)
    await expect(whole.querySelector('[data-over]')).toBeNull()
    await expect(
      whole.querySelector('[data-slot="threshold"]'),
    ).toBeInTheDocument()

    const quiet = canvas.getByRole('img', { name: '中央テレビ1の推移' })

    await expect(quiet.querySelectorAll('[data-slot="step"]').length).toBe(0)
    await expect(quiet.querySelectorAll('[data-level="nodata"]').length).toBe(
      24,
    )
    await expect(canvas.queryByText('暫定')).toBeNull()
  },
}

export const 閾値を越えた刻みがある: Story = {
  args: { result: OVER_THE_LINE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const whole = canvas.getByRole('img', { name: '全体の推移' })

    await expect(whole.querySelectorAll('[data-slot="step"]').length).toBe(12)
    await expect(whole.querySelectorAll('[data-over]').length).toBe(2)
    await expect(whole.querySelectorAll('[data-slot="riser"]').length).toBe(8)

    const labels = within(trendPanel(canvasElement)).getAllByText('0.02%')
    const lines = canvasElement.querySelectorAll('[data-slot="threshold"]')

    await expect(labels.length).toBe(3)
    await expect(lines.length).toBe(3)

    for (const [index, label] of labels.entries()) {
      await expect(
        Math.abs(middleOf(label).y - middleOf(lines[index]).y),
      ).toBeLessThan(1.5)
    }
  },
}

export const 放送日の刻みが2つだけの24時間: Story = {
  args: { result: TWO_BROADCAST_DAYS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const whole = canvas.getByRole('img', { name: '全体の推移' })
    const [step] = whole.querySelectorAll('[data-slot="step"]')
    const box = whole.getBoundingClientRect()
    const drawn = step.getBoundingClientRect()

    await expect(whole.querySelectorAll('[data-slot="step"]').length).toBe(1)
    await expect(Math.abs(drawn.left - box.left)).toBeLessThan(2)
    await expect(
      Math.abs(drawn.right - (box.left + (box.width * 15.35) / 24)),
    ).toBeLessThan(2)
    await expect(whole.querySelectorAll('title').length).toBe(2)

    const quiet = canvas.getByRole('img', { name: '中央テレビ1の推移' })

    await expect(quiet.querySelectorAll('[data-slot="step"]').length).toBe(0)
  },
}

export const 推移_7日: Story = {
  args: { result: A_WEEK },
  play: async ({ canvasElement }) => {
    const panel = within(trendPanel(canvasElement))
    const whole = panel.getByRole('img', { name: '全体の推移' })
    const rules = [...whole.querySelectorAll('line[stroke-dasharray="1 3"]')]

    await expect(rules.length).toBe(7)
    await expect(panel.getByText('09/01 14:00')).toBeVisible()
    await expect(panel.getByText('09/08 14:00')).toBeVisible()

    for (const [day, rule] of [
      ['09/04', rules[2]],
      ['09/05', rules[3]],
      ['09/06', rules[4]],
    ] as const) {
      const label = panel.getByText(day)

      await expect(label.getBoundingClientRect().width).toBeGreaterThan(0)
      await expect(Math.abs(middleOf(label).x - middleOf(rule).x)).toBeLessThan(
        1.5,
      )
    }
  },
}

const TUNER_STATE_COLUMN = 1

export const 札の並び: Story = {
  args: { result: QUALITY },
  play: async ({ canvasElement }) => {
    const rows = rowsOfTheTableHeaded(canvasElement, 'チューナー')

    await expect(rows.length).toBeGreaterThan(1)
    await saysItWithoutAnEdge(rows, TUNER_STATE_COLUMN)
  },
}
