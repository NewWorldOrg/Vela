import type { Meta, StoryObj } from '@storybook/nextjs'
import { userEvent, waitFor, within } from 'storybook/test'

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
    onClose: () => {},
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

export const 通常: Story = {}

export const 全完了: Story = {
  args: { status: COLLECTION_ALL_COMPLETE },
}

export const 収集不調: Story = {
  args: { status: COLLECTION_TROUBLED },
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

export const 全破棄の確認: Story = {
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
