import type { Meta, StoryObj } from '@storybook/nextjs'

import { CHANNEL_FIXTURES } from '@/repository/channels.fixtures'
import { PROGRAM_FIXTURES } from '@/repository/programs.fixtures'
import { SearchView } from '@/page-component/search/search-view'

const genres = [
  ...new Map(
    PROGRAM_FIXTURES.map((p) => [
      p.genre,
      { value: p.genre, label: p.genreLabel },
    ]),
  ).values(),
]

const channels = CHANNEL_FIXTURES.map((c) => ({
  value: c.id,
  label: c.name,
}))

const hits = PROGRAM_FIXTURES.filter((p) => p.genre === 'anime').map((p) => ({
  ...p,
  channelName: CHANNEL_FIXTURES.find((c) => c.id === p.channelId)?.name ?? '',
  channelNo: CHANNEL_FIXTURES.find((c) => c.id === p.channelId)?.no ?? '',
  dayLabel: '08/08 (金)',
}))

const meta = {
  title: 'Screens/番組検索',
  component: SearchView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SearchView>

export default meta
type Story = StoryObj<typeof meta>

export const 入力前: Story = {
  args: {
    result: { condition: {}, hasCondition: false, hits: [], genres, channels },
  },
}

export const 検索結果: Story = {
  args: {
    result: {
      condition: { q: 'アニメ', genre: 'anime' },
      hasCondition: true,
      hits,
      genres,
      channels,
    },
  },
}

export const 該当なし: Story = {
  args: {
    result: {
      condition: { q: '見つからない語' },
      hasCondition: true,
      hits: [],
      genres,
      channels,
    },
  },
}
