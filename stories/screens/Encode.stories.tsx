import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, within } from 'storybook/test'

import {
  CANCELLED_JOB,
  COMPLETED_JOB,
  EMPTY_ENCODE_SCREEN,
  ENCODE_SCREEN,
  FAILED_JOB,
  MORE_JOBS_THAN_FIT,
  QUEUED_JOB,
  RUNNING_JOB,
  STALLED_JOB,
  jobsPage,
  screenWith,
} from '@/repository/encode.fixtures'
import { EncodeView } from '@/components/encode/encode-page'
import { scrollsInsideWithItsHeaderHeld } from '@/stories/scrolls-inside'

const meta = {
  title: 'Screens/設定・エンコード',
  component: EncodeView,
  parameters: { layout: 'fullscreen' },
  args: {
    screen: ENCODE_SCREEN,
    actions: {
      onDefineProfile: async () => ({ state: 'ok' }) as const,
      onDefineDestination: async () => ({ state: 'ok' }) as const,
      onCallOff: async () => ({ state: 'ok' }) as const,
    },
  },
} satisfies Meta<typeof EncodeView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const jobs = within(canvas.getAllByRole('table')[0])

    await expect(canvas.getByText('ジョブの現在地')).toBeVisible()
    await expect(jobs.getAllByRole('button', { name: '中止' })).toHaveLength(1)
    await expect(jobs.getByText('録画削除済み')).toBeVisible()
  },
}

export const 空の状態: Story = {
  args: { screen: EMPTY_ENCODE_SCREEN },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('ジョブの履歴がありません')).toBeVisible()
    await expect(canvas.getByText('プロファイルがありません')).toBeVisible()
    await expect(canvas.getByText('保存先がありません')).toBeVisible()

    const destination = canvas.getByRole('button', { name: '保存先を追加' })
    await expect(destination).toBeDisabled()
    await expect(destination).toHaveAttribute(
      'title',
      'プロファイルがないため追加できません',
    )
  },
}

export const 待機中: Story = {
  args: { screen: screenWith(QUEUED_JOB) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const jobs = within(canvas.getAllByRole('table')[0])

    await expect(jobs.getByText('待機中')).toBeVisible()
    await expect(jobs.getByRole('button', { name: '中止' })).toBeEnabled()
  },
}

export const 実行中: Story = {
  args: { screen: screenWith(RUNNING_JOB) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('progressbar', { name: 'エンコードの進捗' }),
    ).toHaveAttribute('aria-valuenow', '42')
    await expect(canvas.getAllByText('残り 10:23').length).toBeGreaterThan(0)
    await expect(
      within(canvas.getAllByRole('table')[0]).queryByRole('button', {
        name: '中止',
      }),
    ).toBeNull()
  },
}

export const 停滞: Story = {
  args: { screen: screenWith(STALLED_JOB) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getAllByText('停滞').length).toBeGreaterThan(0)
    await expect(canvas.getAllByText('停滞 12分34秒').length).toBeGreaterThan(0)
    await expect(
      canvas.getAllByText('GPU に到達できない').length,
    ).toBeGreaterThan(0)
  },
}

export const 失敗: Story = {
  args: { screen: screenWith(FAILED_JOB) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const jobs = within(canvas.getAllByRole('table')[0])

    await expect(jobs.getByText('失敗')).toBeVisible()
    await expect(jobs.getByText('ffmpeg 非0終了')).toBeVisible()
    await expect(jobs.getByText('2 回目')).toBeVisible()
  },
}

export const 完了: Story = {
  args: { screen: screenWith(COMPLETED_JOB) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const jobs = within(canvas.getAllByRole('table')[0])

    await expect(jobs.getByText('完了')).toBeVisible()
    await expect(jobs.getByText('100%')).toBeVisible()
  },
}

export const 中止: Story = {
  args: { screen: screenWith(CANCELLED_JOB) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const jobs = within(canvas.getAllByRole('table')[0])

    await expect(jobs.getByText('中止')).toBeVisible()
    await expect(jobs.getByText('録画削除済み')).toBeVisible()
    await expect(jobs.queryByRole('button', { name: '中止' })).toBeNull()
  },
}

export const 失敗だけに絞る: Story = {
  args: {
    screen: {
      ...ENCODE_SCREEN,
      jobs: jobsPage([FAILED_JOB], { status: 'failed' }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('button', { name: '失敗', pressed: true }),
    ).toBeVisible()
    await expect(canvas.getByText(/該当/)).toBeVisible()
  },
}

export const 条件に合うジョブがない: Story = {
  args: {
    screen: {
      ...ENCODE_SCREEN,
      jobs: jobsPage([], { status: 'cancelled' }),
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText('条件に合うジョブがありません'),
    ).toBeVisible()
  },
}

export const 収まらないほどのジョブ: Story = {
  args: { screen: MORE_JOBS_THAN_FIT },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await scrollsInsideWithItsHeaderHeld(canvasElement, '番組')
    await expect(
      canvas.getByRole('button', { name: '2 ページ目' }),
    ).toHaveAttribute('aria-current', 'page')
  },
}

export const 狭い幅で収まらないほどのジョブ: Story = {
  args: { screen: MORE_JOBS_THAN_FIT },
  parameters: { screen: { width: 768, height: 1024 } },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, '番組')
  },
}

export const プロファイルを追加する: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: 'プロファイルを追加' }),
    )

    const dialog = await screen.findByRole('dialog', {
      name: 'プロファイルを追加',
    })

    await expect(
      within(dialog).getByRole('button', { name: 'H.265' }),
    ).toBeVisible()

    await userEvent.click(
      within(dialog).getByRole('button', { name: '追加する' }),
    )
    await expect(
      within(dialog).getByText('名称を入力してください。'),
    ).toBeVisible()
  },
}

export const 保存先を追加する: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '保存先を追加' }))

    const dialog = await screen.findByRole('dialog', { name: '保存先を追加' })

    await expect(within(dialog).getByText('encodes')).toBeVisible()
    await expect(within(dialog).getByText('録画再生用')).toBeVisible()
  },
}
