import type { Meta, StoryObj } from '@storybook/nextjs'

import { SessionEndedBanner } from '@/components/guide/guide-live'

const meta = {
  title: 'Components/SessionEnded',
  component: SessionEndedBanner,
  parameters: { layout: 'fullscreen' },
  render: (args) => (
    <div className="mx-auto max-w-[820px] p-6">
      <SessionEndedBanner {...args} />
    </div>
  ),
} satisfies Meta<typeof SessionEndedBanner>

export default meta
type Story = StoryObj<typeof meta>

export const 番組表: Story = {
  args: { returnPath: '/guide' },
}

export const 絞り込んだ番組表: Story = {
  args: { returnPath: '/guide?kind=bs&date=2026-08-19' },
}
