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

export const サインインに失敗したとき: Story = {
  args: { notice: { kind: 'refused' } },
}

export const 試行が多すぎるとき: Story = {
  args: {
    notice: {
      kind: 'rate-limited',
      retryAt: new Date(2026, 0, 1, 9, 12).getTime(),
    },
  },
}

export const 要求が届かないとき: Story = {
  args: { notice: { kind: 'unavailable' } },
}
