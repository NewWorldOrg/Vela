import type { Meta, StoryObj } from '@storybook/nextjs'
import { fn } from 'storybook/test'

import { CHANNEL_FIXTURES } from '@/repository/channels.fixtures'
import {
  PROGRAM_DAY,
  PROGRAM_DETAIL_FIXTURES,
  PROGRAM_FIXTURES,
} from '@/repository/programs.fixtures'
import { ProgramPanel } from '@/components/guide/program-panel'

const idle = PROGRAM_FIXTURES.find((p) => p.subtitled && p.description)!
const booked = PROGRAM_FIXTURES.find((p) => p.booked)!
const multiline = PROGRAM_DETAIL_FIXTURES.multiline.program

const channelOf = (channelId: string) =>
  CHANNEL_FIXTURES.find((channel) => channel.id === channelId)

const meta = {
  title: 'Components/ProgramPanel',
  component: ProgramPanel,
  parameters: { layout: 'fullscreen' },
  args: {
    dayLabel: PROGRAM_DAY.label,
    open: true,
    onClose: fn(),
  },
} satisfies Meta<typeof ProgramPanel>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = {
  args: { program: idle, channel: channelOf(idle.channelId) },
}

export const 予約済み: Story = {
  args: { program: booked, channel: channelOf(booked.channelId) },
}

export const 改行を含む本文: Story = {
  args: { program: multiline, channel: channelOf(multiline.channelId) },
}

export const 閉じた状態: Story = {
  args: { program: idle, channel: channelOf(idle.channelId), open: false },
}
