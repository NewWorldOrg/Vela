import type { Meta, StoryObj } from '@storybook/nextjs'

import { CHANNELS } from '@/repository/channels'
import { GUIDE_DAYS } from '@/repository/programs'
import { PROGRAM_FIXTURES } from '@/repository/programs.fixtures'
import { GuideView } from '@/page-component/guide/guide-view'

const base = {
  kind: 'terrestrial' as const,
  day: GUIDE_DAYS[1],
  windowStartHour: 19,
  windowHours: 8,
  nowMin: 124,
  nowLabel: '21:04',
  channels: CHANNELS,
  programs: PROGRAM_FIXTURES,
}

const meta = {
  title: 'Screens/番組表',
  component: GuideView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof GuideView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = { args: { guide: base } }

export const 別の日: Story = {
  args: {
    guide: {
      ...base,
      day: GUIDE_DAYS[2],
      nowMin: undefined,
      nowLabel: undefined,
    },
  },
}

export const 番組情報が不足: Story = {
  args: {
    guide: {
      ...base,
      kind: 'bs',
      channels: [],
      programs: [],
      coverageWarning: {
        kind: 'BS',
        body: 'BS の番組情報が不足しています(カバレッジ 0 日)。チャンネル設定を確認してください。',
      },
    },
  },
}
