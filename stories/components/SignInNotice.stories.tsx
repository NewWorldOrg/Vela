import type { Meta, StoryObj } from '@storybook/nextjs'

import { SignInNoticeAlert } from '@/components/login/local-sign-in'

const meta = {
  title: 'Components/SignInNotice',
  component: SignInNoticeAlert,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-[326px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SignInNoticeAlert>

export default meta
type Story = StoryObj<typeof meta>

export const 一律の失敗: Story = {
  args: { notice: { kind: 'refused' } },
}

export const レート制限中: Story = {
  args: {
    notice: {
      kind: 'rate-limited',
      retryAt: new Date(2026, 0, 1, 9, 12).getTime(),
    },
  },
}

export const 受け付けに接続できない: Story = {
  args: { notice: { kind: 'unavailable' } },
}
