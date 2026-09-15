import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'

import {
  MORE_TUNERS_THAN_FIT,
  NOTHING_MEASURED,
  QUALITY,
} from '@/repository/quality.fixtures'
import type { QualityReviseThreshold } from '@/components/quality/quality-page'
import { QualityView } from '@/components/quality/quality-page'
import { scrollsInsideWithItsHeaderHeld } from '@/stories/scrolls-inside'

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
  parameters: { layout: 'fullscreen' },
  args: { onReviseThreshold: reviseThreshold },
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
