import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import { LocalSignIn } from '@/components/login/local-sign-in'

const REFUSED = 'サインインに失敗しました。もう一度お試しください。'

const RATE_LIMITED =
  'サインインの試行が多すぎます。09:12 以降にもう一度お試しください。'

const UNAVAILABLE =
  'サインインの要求が届きませんでした。時間をおいてもう一度お試しください。'

const NOW = Date.parse('2026-01-01T09:10:30+09:00')

function loginAnswering(answer: () => Promise<Response>) {
  return () => {
    const trueFetch = window.fetch
    const trueNow = Date.now

    window.fetch = (() => answer()) as typeof fetch
    Date.now = () => NOW

    return () => {
      window.fetch = trueFetch
      Date.now = trueNow
    }
  }
}

function signingIn(notice: string) {
  return async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement)

    await userEvent.type(canvas.getByLabelText('ユーザー名'), 'operator')
    await userEvent.type(
      canvas.getByLabelText('パスワード'),
      'a password long enough',
    )
    await userEvent.click(canvas.getByRole('button', { name: 'サインイン' }))

    await waitFor(() => expect(canvas.getByText(notice)).toBeVisible())
  }
}

const meta = {
  title: 'Components/SignInNotice',
  component: LocalSignIn,
  parameters: { layout: 'centered' },
  args: { returnPath: '/', placement: 'lead' },
  decorators: [
    (Story) => (
      <div className="w-[326px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LocalSignIn>

export default meta
type Story = StoryObj<typeof meta>

export const サインインに失敗したとき: Story = {
  beforeEach: loginAnswering(async () => new Response(null, { status: 401 })),
  play: signingIn(REFUSED),
}

export const 試行が多すぎるとき: Story = {
  beforeEach: loginAnswering(
    async () =>
      new Response(null, { status: 429, headers: { 'retry-after': '90' } }),
  ),
  play: signingIn(RATE_LIMITED),
}

export const 要求が届かないとき: Story = {
  beforeEach: loginAnswering(() =>
    Promise.reject(new TypeError('Failed to fetch')),
  ),
  play: signingIn(UNAVAILABLE),
}
