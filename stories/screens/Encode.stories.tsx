import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, within } from 'storybook/test'

import { ENCODE } from '@/repository/encode.fixtures'
import { EncodeView } from '@/components/encode/encode-page'

const meta = {
  title: 'Screens/設定・エンコード',
  component: EncodeView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof EncodeView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = { args: { result: ENCODE } }

export const ジョブなし: Story = {
  args: {
    result: { ...ENCODE, running: null, waiting: 0, failed: 0, failures: [] },
  },
}

/**
 * The encode domain has nothing behind it yet, so every control here is one
 * that will one day answer and cannot answer now. Each has to say so: a
 * control drawn unpressable with no reason leaves the reader to guess whether
 * it is broken, forbidden, or waiting on something they did.
 */
export const 押せない理由: Story = {
  args: { result: ENCODE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const reasons: [string, string][] = [
      ['中止', 'ジョブの中止はこれから実装されます'],
      ['録画詳細を開く', '録画詳細への移動はこれから実装されます'],
      ['プロファイルを追加', 'プロファイルの追加はこれから実装されます'],
      ['元に戻す', 'プロファイルの編集はこれから実装されます'],
      ['保存', 'プロファイルの編集はこれから実装されます'],
    ]

    for (const [name, reason] of reasons) {
      const control = canvas.getByRole('button', { name })
      await expect(control).toBeDisabled()
      await expect(control).toHaveAttribute('title', reason)
    }

    for (const retry of canvas.getAllByRole('button', { name: '再試行' })) {
      await expect(retry).toBeDisabled()
      await expect(retry).toHaveAttribute(
        'title',
        '失敗したジョブの再試行はこれから実装されます',
      )
    }

    // Named by what it switches, not by the word standing beside it.
    const auto = canvas.getByRole('switch', {
      name: '録画終了後に自動エンコード',
    })
    await expect(auto).toBeDisabled()
    await expect(auto).toHaveAttribute(
      'title',
      '自動エンコードの切り替えはこれから実装されます',
    )

    for (const field of canvas.getAllByRole('textbox')) {
      await expect(field).toBeDisabled()
      await expect(field).toHaveAttribute(
        'title',
        'プロファイルの編集はこれから実装されます',
      )
    }
  },
}
