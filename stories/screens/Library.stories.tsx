import type { Meta, StoryObj } from '@storybook/nextjs'

import { RECORDING_FIXTURES } from '@/repository/recordings.fixtures'
import { LibraryView } from '@/components/library/library-page'

const all = [...RECORDING_FIXTURES].sort(
  (a, b) =>
    (b.startedAt ?? '').localeCompare(a.startedAt ?? '') ||
    b.id.localeCompare(a.id, undefined, { numeric: true }),
)

const result = {
  items: all,
  total: all.length,
  channels: [...new Set(all.map((r) => r.channel))],
  years: [...new Set(all.map((r) => r.year))].sort((a, b) => b - a),
  genres: [...new Set(all.map((r) => r.genre))],
  filter: {},
}

const meta = {
  title: 'Screens/録画ライブラリ',
  component: LibraryView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LibraryView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = {
  args: { result, filter: {} },
}

export const 検索0件: Story = {
  args: {
    result: { ...result, items: [], filter: { q: '該当なし' } },
    filter: { q: '該当なし' },
  },
}

export const 録画0件: Story = {
  args: {
    result: { ...result, items: [], total: 0, filter: {} },
    filter: {},
  },
}
