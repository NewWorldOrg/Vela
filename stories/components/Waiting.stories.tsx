import type { Meta, StoryObj } from '@storybook/nextjs'

import { SectionHeading } from '@/components/vela/section-heading'
import { MarkDots } from '@/components/vela/icons'
import { WaitingRows } from '@/components/vela/waiting-rows'

const meta = {
  title: 'Components/状態と知らせ/読み込み中',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const 一覧の中: Story = {
  render: () => (
    <div className="mx-auto max-w-[840px] p-6">
      <SectionHeading>一覧</SectionHeading>
      <WaitingRows rows={3} />
    </div>
  ),
}
