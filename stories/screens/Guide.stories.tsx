import type { Meta, StoryObj } from '@storybook/nextjs'

import { CHANNEL_FIXTURES } from '@/repository/channels.fixtures'
import {
  GUIDE_DAYS,
  NOW_LABEL,
  NOW_MIN,
  PROGRAM_FIXTURES,
} from '@/repository/programs.fixtures'
import { GuideView } from '@/components/guide/guide-page'

const base = {
  kind: 'terrestrial' as const,
  day: GUIDE_DAYS[1],
  days: GUIDE_DAYS,
  windowStartHour: 19,
  windowHours: 8,
  nowMin: NOW_MIN,
  nowLabel: NOW_LABEL,
  channels: CHANNEL_FIXTURES,
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
