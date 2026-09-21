import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'

import type { CollectNowResult, RebuildResult } from '@/repository/collection'
import {
  COLLECTION_ALL_COMPLETE,
  COLLECTION_FIXTURES,
  COLLECTION_TROUBLED,
} from '@/repository/collection.fixtures'
import { CollectionDrawer } from '@/components/guide/collection-drawer'
import { RebuildEpgDialog } from '@/components/guide/rebuild-dialog'

const answering = (result: CollectNowResult) => async () => result

const rebuilt: RebuildResult = { state: 'ok', discarded: 3521 }

const meta = {
  title: 'Screens/番組表 収集状態',
  component: CollectionDrawer,
  parameters: { layout: 'fullscreen' },
  args: {
    status: COLLECTION_FIXTURES,
    open: true,
    onClose: fn(),
    onCollectNow: answering({ state: 'started', streams: 7 }),
    onRebuild: async () => rebuilt,
  },
  decorators: [
    (Story) => (
      <div className="dot-grid h-dvh bg-bg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CollectionDrawer>

export default meta
type Story = StoryObj<typeof meta>

const NOTHING_IN_ENGLISH = /Complete|BasicOnly|Incomplete|extended/

export const 通常: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getAllByText('完了').length).toBeGreaterThan(0)
    await expect(canvas.getByText('基本のみ')).toBeVisible()
    await expect(canvas.getByText('詳細は次回に持ち越し')).toBeVisible()
    await expect(canvasElement).not.toHaveTextContent(NOTHING_IN_ENGLISH)
  },
}

export const 全完了: Story = {
  args: { status: COLLECTION_ALL_COMPLETE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText(/TS が完了。/)).toBeVisible()
    await expect(canvasElement).not.toHaveTextContent(NOTHING_IN_ENGLISH)
  },
}

export const 収集不調: Story = {
  args: { status: COLLECTION_TROUBLED },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getAllByText('不調').length).toBeGreaterThan(0)
    await expect(canvasElement).not.toHaveTextContent(NOTHING_IN_ENGLISH)
  },
}

const pressCollect =
  (expected: string) =>
  async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      await canvas.findByRole('button', { name: 'いますぐ集める' }),
    )
    await waitFor(() => canvas.getByText(expected, { exact: false }))
  }

export const 受け付けた: Story = {
  play: pressCollect('いますぐ集めるを受け付けました'),
}

export const ガード非活性: Story = {
  args: {
    onCollectNow: answering({ state: 'running' }),
  },
  play: pressCollect('実行中のブーストが 1 本あります'),
}

export const 全削除の確認: Story = {
  render: (args) => (
    <RebuildEpgDialog
      open
      onOpenChange={() => {}}
      kindCounts={args.status.kindCounts}
      onRebuild={args.onRebuild}
      onDiscarded={() => {}}
    />
  ),
}

const showed = (canvasElement: HTMLElement) =>
  waitFor(() =>
    expect(canvasElement.querySelector('[role="dialog"]')).toHaveFocus(),
  )

export const 範囲外を押すと閉じる: Story = {
  play: async ({ args, canvasElement }) => {
    await showed(canvasElement)
    await userEvent.click(document.body)
    await waitFor(() => expect(args.onClose).toHaveBeenCalled())
  },
}

export const Escで閉じる: Story = {
  play: async ({ args, canvasElement }) => {
    await showed(canvasElement)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(args.onClose).toHaveBeenCalled())
  },
}

export const 確認の上のEscは確認だけを閉じる: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await showed(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: /全削除/ }))
    await screen.findByRole('alertdialog')

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    await expect(args.onClose).not.toHaveBeenCalled()
  },
}
