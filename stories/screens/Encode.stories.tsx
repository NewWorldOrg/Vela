import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'

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

const callOff = fn(async () => ({ state: 'ok' }) as const)

const meta = {
  title: 'Screens/設定・エンコード',
  component: EncodeView,
  parameters: { layout: 'fullscreen' },
  args: {
    screen: ENCODE_SCREEN,
    actions: {
      onDefineProfile: async () => ({ state: 'ok' }) as const,
      onDefineDestination: async () => ({ state: 'ok' }) as const,
      onCallOff: callOff,
    },
  },
} satisfies Meta<typeof EncodeView>

export default meta
type Story = StoryObj<typeof meta>

/** The waiting and failed counts, read as the two chips under the running job. */
async function counts(
  canvas: ReturnType<typeof within>,
  waiting: number,
  failed: number,
) {
  await expect(canvas.getByText(`待機 ${waiting} 本`)).toBeVisible()
  await expect(canvas.getByText(`失敗 ${failed} 本`)).toBeVisible()
}

function runningCard(canvasElement: HTMLElement) {
  const card = canvasElement.querySelector<HTMLElement>(
    '[data-slot="running-job"]',
  )

  if (!card) {
    throw new Error('the running job is not on the screen')
  }

  return within(card)
}

export const 通常: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const jobs = within(canvas.getAllByRole('table')[0])

    await expect(canvas.getByText('ジョブの現在地')).toBeVisible()
    await expect(jobs.getAllByRole('button', { name: '中止' })).toHaveLength(2)
    await expect(jobs.getByText('録画削除済み')).toBeVisible()
    await counts(canvas, 1, 1)
  },
}

export const 空の状態: Story = {
  args: { screen: EMPTY_ENCODE_SCREEN },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('ジョブの履歴がありません')).toBeVisible()
    await expect(canvas.getByText('プロファイルがありません')).toBeVisible()
    await expect(canvas.getByText('保存先がありません')).toBeVisible()
    await counts(canvas, 0, 0)

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
    callOff.mockClear()

    const canvas = within(canvasElement)

    const jobs = within(canvas.getAllByRole('table')[0])

    await expect(jobs.getByText('待機中')).toBeVisible()
    await counts(canvas, 1, 0)

    await userEvent.click(jobs.getByRole('button', { name: '中止' }))

    await waitFor(() => expect(callOff).toHaveBeenCalledWith('job-q'))
    await expect(screen.queryByRole('alertdialog')).toBeNull()
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
      within(canvas.getAllByRole('table')[0]).getByRole('button', {
        name: '中止',
      }),
    ).toBeEnabled()
    await expect(
      runningCard(canvasElement).getByRole('button', { name: '中止' }),
    ).toBeEnabled()
    await counts(canvas, 0, 0)
  },
}

export const 実行中の中止を確かめる: Story = {
  args: { screen: screenWith(RUNNING_JOB) },
  play: async ({ canvasElement }) => {
    callOff.mockClear()

    await userEvent.click(
      runningCard(canvasElement).getByRole('button', { name: '中止' }),
    )

    const dialog = await screen.findByRole('alertdialog', {
      name: 'このエンコードを中止します',
    })

    await expect(
      within(dialog).getByText('のエンコードを途中で止めます。', {
        exact: false,
      }),
    ).toBeVisible()
    await expect(within(dialog).getByText('週末キッチンの手帖')).toBeVisible()
    await expect(callOff).not.toHaveBeenCalled()
  },
}

export const 実行中を中止する: Story = {
  args: { screen: screenWith(RUNNING_JOB) },
  play: async ({ canvasElement }) => {
    callOff.mockClear()

    const jobs = within(within(canvasElement).getAllByRole('table')[0])

    await userEvent.click(jobs.getByRole('button', { name: '中止' }))

    const dialog = await screen.findByRole('alertdialog', {
      name: 'このエンコードを中止します',
    })

    await userEvent.click(
      within(dialog).getByRole('button', { name: '中止する' }),
    )

    await waitFor(() => expect(callOff).toHaveBeenCalledWith('job-r'))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  },
}

export const 実行中の中止を断られる: Story = {
  args: {
    screen: screenWith(RUNNING_JOB),
    actions: {
      onDefineProfile: async () => ({ state: 'ok' }) as const,
      onDefineDestination: async () => ({ state: 'ok' }) as const,
      onCallOff: async () =>
        ({
          state: 'rejected',
          message: 'このジョブはすでに終わっているため、中止できませんでした。',
        }) as const,
    },
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      runningCard(canvasElement).getByRole('button', { name: '中止' }),
    )

    const dialog = await screen.findByRole('alertdialog', {
      name: 'このエンコードを中止します',
    })

    await userEvent.click(
      within(dialog).getByRole('button', { name: '中止する' }),
    )

    await expect(
      await within(dialog).findByText(
        'このジョブはすでに終わっているため、中止できませんでした。',
      ),
    ).toBeVisible()
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
    await counts(canvas, 0, 1)
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

export const 保存先の追加を断られる: Story = {
  args: {
    actions: {
      onDefineProfile: async () => ({ state: 'ok' }) as const,
      onDefineDestination: async () =>
        ({
          state: 'rejected',
          message: 'この出力ルートには成果物を置けません。',
        }) as const,
      onCallOff: callOff,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '保存先を追加' }))

    const dialog = await screen.findByRole('dialog', { name: '保存先を追加' })

    await userEvent.type(within(dialog).getByLabelText(/名称/), '書庫')
    await userEvent.click(
      within(dialog).getByRole('button', { name: '追加する' }),
    )

    await expect(
      await within(dialog).findByText('この出力ルートには成果物を置けません。'),
    ).toBeVisible()
  },
}
