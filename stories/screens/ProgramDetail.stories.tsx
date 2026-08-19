import type { Meta, StoryObj } from '@storybook/nextjs'

import { PROGRAM_DETAIL_FIXTURES } from '@/repository/programs.fixtures'
import { ProgramDetailView } from '@/components/guide/program-detail-page'

const meta = {
  title: 'Screens/番組詳細',
  component: ProgramDetailView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ProgramDetailView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = {
  args: { detail: PROGRAM_DETAIL_FIXTURES.standard },
}

export const リレーあり: Story = {
  args: { detail: PROGRAM_DETAIL_FIXTURES.relayed },
}

export const 同時放送の重複: Story = {
  args: { detail: PROGRAM_DETAIL_FIXTURES.simulcast },
}

export const 終了未定: Story = {
  args: { detail: PROGRAM_DETAIL_FIXTURES.undecided },
}

export const 情報最小: Story = {
  args: { detail: PROGRAM_DETAIL_FIXTURES.minimal },
}

export const 改行を含む本文: Story = {
  args: { detail: PROGRAM_DETAIL_FIXTURES.multiline },
}
