import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, within } from 'storybook/test'

import {
  OIDC_ADMITS_EVERYONE,
  OIDC_OUT_OF_REACH,
  OIDC_REACHABLE,
  OIDC_UNCONFIGURED,
  LONG_NAMES,
  ONLY_THIS_DEVICE,
  MORE_SESSIONS_THAN_FIT,
  SESSIONS,
  SIGNED_IN_LOCALLY,
  SIGNED_IN_WITH_A_PROVIDER,
} from '@/repository/authentication.fixtures'
import { AuthenticationView } from '@/components/authentication/authentication-page'
import { scrollsInsideWithItsHeaderHeld } from '@/stories/scrolls-inside'

const meta = {
  title: 'Screens/設定・認証',
  component: AuthenticationView,
  parameters: { layout: 'fullscreen' },
  args: {
    sessions: SESSIONS,
    signedIn: SIGNED_IN_WITH_A_PROVIDER,
    oidc: OIDC_REACHABLE,
    onRevoke: async () => ({ state: 'ok' }) as const,
    onChangePassword: async () => ({ state: 'ok', sessionsEnded: 3 }) as const,
    onSaveOidc: async () => ({ state: 'ok' }) as const,
  },
} satisfies Meta<typeof AuthenticationView>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Every session on the system is here, not only this device's, so each row
 * says whose it is. Only the row reading the page signs out; every other row,
 * whoever it belongs to, can be revoked.
 */
export const 通常: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('columnheader', { name: 'アカウント' }),
    ).toBeVisible()
    await expect(canvas.getAllByText('aki@example.test')).toHaveLength(2)
    await expect(canvas.getByText('nao@example.test')).toBeVisible()
    await expect(canvas.getByText('operator')).toBeVisible()

    await expect(
      canvas.getAllByRole('button', { name: 'ログアウト' }),
    ).toHaveLength(1)
    await expect(
      canvas.getAllByRole('button', { name: '失効させる' }),
    ).toHaveLength(SESSIONS.length - 1)
  },
}

/**
 * A name the column cannot hold on one line folds inside the column rather
 * than pushing every other column out of the window.
 */
export const 名前が長いセッション: Story = {
  args: { sessions: LONG_NAMES },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const subject = canvas.getByText(
      'k3Jr9vQm2LZp8xWc4TnB7yHd0sFq6aUe1oGiRtYlMwK',
    )
    const cell = subject.closest('td')

    if (!cell) {
      throw new Error('the name is not in a cell')
    }

    await expect(cell.getBoundingClientRect().width).toBeLessThanOrEqual(280)
    await expect(subject.getBoundingClientRect().height).toBeGreaterThan(
      Number.parseFloat(getComputedStyle(subject).lineHeight),
    )
  },
}

export const いまの端末のみ: Story = { args: { sessions: ONLY_THIS_DEVICE } }

export const 失効直後: Story = {
  args: { notice: { kind: 'revoked', device: 'Safari / iPadOS 18' } },
}

export const パスワード変更直後: Story = {
  args: {
    sessions: ONLY_THIS_DEVICE,
    signedIn: SIGNED_IN_LOCALLY,
    notice: { kind: 'password', sessionsEnded: 3 },
  },
}

export const OIDC未設定: Story = {
  args: {
    sessions: ONLY_THIS_DEVICE,
    signedIn: SIGNED_IN_LOCALLY,
    oidc: OIDC_UNCONFIGURED,
  },
}

export const 絞り込み未設定: Story = { args: { oidc: OIDC_ADMITS_EVERYONE } }

export const 収まらないほどのセッション: Story = {
  args: { sessions: MORE_SESSIONS_THAN_FIT },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, '端末')
  },
}

export const 狭い幅で収まらないほどのセッション: Story = {
  args: { sessions: MORE_SESSIONS_THAN_FIT },
  parameters: { screen: { width: 768, height: 1024 } },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, '端末')
  },
}

export const IDプロバイダに到達できない: Story = {
  args: { oidc: OIDC_OUT_OF_REACH },
}

/**
 * Pressing the button has to open the dialog, and the fields have to be drawn
 * when it does.
 *
 * Every job was green while this press replaced the screen with an error
 * boundary, because nothing anywhere pressed it: the screen stories drew the
 * button and stopped there, and a button nobody presses cannot say what it
 * opens. So the press is here, and so is what has to be on the other side of
 * it — both fields, masked, and a switch on each that unmasks its own field
 * and leaves the other one alone.
 *
 * The switches are taken as a pair rather than counted, so that a field added
 * here later is a story to extend rather than a number to bump, while a field
 * that loses its switch still fails.
 */
export const パスワードを変更する対話: Story = {
  args: { sessions: ONLY_THIS_DEVICE, signedIn: SIGNED_IN_LOCALLY },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: 'パスワードを変更' }),
    )

    /** Radix hands the dialog to a portal, outside the story's own canvas. */
    const dialog = within(await within(document.body).findByRole('alertdialog'))

    const current = await dialog.findByLabelText('いまのパスワード')
    const replacement = await dialog.findByLabelText('新しいパスワード')

    await expect(current).toHaveAttribute('type', 'password')
    await expect(replacement).toHaveAttribute('type', 'password')

    const [showCurrent, showReplacement] = await dialog.findAllByRole(
      'button',
      {
        name: 'パスワードを表示する',
      },
    )

    await userEvent.click(showCurrent)

    await expect(current).toHaveAttribute('type', 'text')
    await expect(replacement).toHaveAttribute('type', 'password')

    await userEvent.click(showReplacement)

    await expect(replacement).toHaveAttribute('type', 'text')
  },
}
