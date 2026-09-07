import { useState, type ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import type { WriteResult } from '@/repository/services'
import {
  CHANNELS,
  MORE_ATTEMPTS_THAN_FIT,
  MORE_CHANNELS_THAN_FIT,
  SCAN_RUNNING,
} from '@/repository/services.fixtures'
import { AddCandidateDialog } from '@/components/channels/add-candidate-dialog'
import { ChannelsView } from '@/components/channels/channels-page'
import { scrollsInsideWithItsHeaderHeld } from '@/stories/scrolls-inside'

type ChannelsViewProps = ComponentProps<typeof ChannelsView>

const accept = async (): Promise<WriteResult> => ({ state: 'ok' })
const refuseWrite = async (): Promise<WriteResult> => ({
  state: 'rejected',
  message:
    'このスキャンはすでに終わっているため、キャンセルできませんでした。最新の状態を読み直しました。',
})
const refuse = async () => ({
  state: 'refused' as const,
  scanId: 'run-3',
  message:
    'すでにスキャンが実行中です。同時に走らせられるのは 1 本までです。実行中のスキャンを確認するか、キャンセルしてから開始してください。',
})

const meta = {
  title: 'Screens/設定・チャンネル',
  component: ChannelsView,
  parameters: { layout: 'fullscreen' },
  args: {
    onStart: refuse,
    onCancel: accept,
    onSelect: accept,
    onAdd: accept,
    onDelete: accept,
  },
} satisfies Meta<typeof ChannelsView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = {
  args: { result: { state: 'ok', result: CHANNELS } },
}

export const 候補を開いた状態: Story = {
  args: { result: { state: 'ok', result: CHANNELS } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: 'みなと総合1 の候補チャンネル' }),
    )

    await expect(canvas.getByText('● 選択中')).toBeVisible()
  },
}

export const 候補の受信状態: Story = {
  args: { result: { state: 'ok', result: CHANNELS } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: 'みなと総合1 の候補チャンネル' }),
    )

    await expect(canvas.getByText('受信可')).toBeVisible()
    await expect(canvas.getByText('受信不可')).toBeVisible()
  },
}

export const 構成変更後に測り直しを待つ候補: Story = {
  args: { result: { state: 'ok', result: CHANNELS } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: 'みなと総合2 の候補チャンネル' }),
    )

    await expect(canvas.getByText('要再検証')).toBeVisible()
  },
}

export const 候補の開閉は取得を伴わない: Story = {
  args: { result: { state: 'ok', result: CHANNELS } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const caret = canvas.getByRole('button', {
      name: 'みなと総合1 の候補チャンネル',
    })

    await userEvent.click(caret)
    await expect(caret).toHaveAttribute('aria-expanded', 'true')

    await userEvent.click(caret)
    await expect(caret).toHaveAttribute('aria-expanded', 'false')
    await waitFor(() => expect(canvas.queryByText('● 選択中')).toBeNull())
  },
}

export const 開閉は遷移で伸び縮みする: Story = {
  args: { result: { state: 'ok', result: CHANNELS } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const caret = canvas.getByRole('button', {
      name: 'みなと総合1 の候補チャンネル',
    })

    await userEvent.click(caret)

    const unfold = canvasElement.querySelector('[data-slot="unfold"]')
    await expect(unfold).not.toBeNull()

    const fold = getComputedStyle(unfold!)
    await expect(fold.transitionProperty).toBe('grid-template-rows')
    await expect(fold.transitionDuration).toBe('0.15s')
    await expect(fold.transitionTimingFunction).toBe(
      'cubic-bezier(0.34, 1.4, 0.64, 1)',
    )

    const turn = getComputedStyle(caret.querySelector('svg')!)
    await expect(turn.transitionProperty).toContain('rotate')
    await expect(turn.transitionDuration).toBe('0.15s')
    await waitFor(() => expect(turn.rotate).toBe('90deg'))
  },
}

export const 閉じるときは縮んでから消える: Story = {
  args: { result: { state: 'ok', result: CHANNELS } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const caret = canvas.getByRole('button', {
      name: 'みなと総合1 の候補チャンネル',
    })

    await userEvent.click(caret)
    const unfold = canvasElement.querySelector('[data-slot="unfold"]')!
    await Promise.all(unfold.getAnimations().map((running) => running.finished))

    const folded = new Promise<string>((resolve) =>
      unfold.addEventListener(
        'transitionend',
        (event) => resolve((event as TransitionEvent).propertyName),
        { once: true },
      ),
    )

    await userEvent.click(caret)
    await expect(folded).resolves.toBe('grid-template-rows')
    await expect(unfold).toHaveAttribute('inert')
    await waitFor(() => expect(canvas.queryByText('● 選択中')).toBeNull())
  },
}

export const 開いてすぐ閉じても行は残らない: Story = {
  args: { result: { state: 'ok', result: CHANNELS } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const caret = canvas.getByRole('button', {
      name: 'みなと総合1 の候補チャンネル',
    })

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => {
        caret.click()
        caret.click()
        resolve()
      }),
    )

    await waitFor(() =>
      expect(canvasElement.querySelector('[data-slot="unfold"]')).toBeNull(),
    )
    await expect(caret).toHaveAttribute('aria-expanded', 'false')
  },
}

export const 開くのは一度にひとつ: Story = {
  args: { result: { state: 'ok', result: CHANNELS } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const first = canvas.getByRole('button', {
      name: 'みなと総合1 の候補チャンネル',
    })
    const second = canvas.getByRole('button', {
      name: '中央テレビ2 の候補チャンネル',
    })

    await userEvent.click(first)
    await userEvent.click(second)

    await expect(first).toHaveAttribute('aria-expanded', 'false')
    await expect(second).toHaveAttribute('aria-expanded', 'true')

    await waitFor(() =>
      expect(
        canvasElement.querySelectorAll('[data-slot="unfold"]'),
      ).toHaveLength(1),
    )
  },
}

export const スキャン中: Story = {
  args: {
    result: {
      state: 'ok',
      result: {
        ...CHANNELS,
        running: { state: 'read', progress: SCAN_RUNNING },
      },
    },
  },
}

export const スキャン中の状況を読めないとき: Story = {
  args: {
    onCancel: refuseWrite,
    result: {
      state: 'ok',
      result: {
        ...CHANNELS,
        groups: CHANNELS.groups.map((group) =>
          group.services.length === 0
            ? { ...group, walk: 'unknown' as const, diagnosis: undefined }
            : group,
        ),
        running: {
          state: 'unreadable',
          run: SCAN_RUNNING.run,
          message: 'driver に接続できません。',
        },
      },
    },
  },
}

export const 未スキャン: Story = {
  args: {
    result: {
      state: 'ok',
      result: {
        unattributed: [],
        groups: CHANNELS.groups.map((group) => ({
          ...group,
          services: [],
          stat: '0 サービス',
          diagnosis: undefined,
          walk: 'never' as const,
        })),
        history: [],
      },
    },
  },
}

export const サインインしていないとき: Story = {
  args: { result: { state: 'unauthenticated' } },
}

export const 取得できないとき: Story = {
  args: {
    result: { state: 'unavailable', message: 'driver に接続できません' },
  },
}

const [service] = CHANNELS.groups[0].services

function AddCandidate({ onAdd }: Pick<ChannelsViewProps, 'onAdd'>) {
  const [open, setOpen] = useState(true)

  return (
    <AddCandidateDialog
      serviceKey={service.key}
      serviceName={service.name}
      open={open}
      onOpenChange={setOpen}
      onAdd={onAdd}
    />
  )
}

export const 候補の手動追加: Story = {
  args: { result: { state: 'ok', result: CHANNELS } },
  render: (args) => <AddCandidate onAdd={args.onAdd} />,
}

export const 手動追加は範囲外を押しても閉じない: Story = {
  ...候補の手動追加,
  play: async () => {
    const dialog = await screen.findByRole('dialog')
    const channel = within(dialog).getByLabelText(/物理チャンネル/)

    await userEvent.type(channel, '21')
    await userEvent.click(
      dialog.ownerDocument.querySelector('[data-slot="dialog-overlay"]')!,
    )

    await expect(screen.getByRole('dialog')).toBeVisible()
    await expect(channel).toHaveValue('21')
  },
}

export const 手動追加はEscで閉じる: Story = {
  ...候補の手動追加,
  play: async () => {
    await screen.findByRole('dialog')

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  },
}

async function bothListsScrollInside(canvasElement: HTMLElement) {
  await scrollsInsideWithItsHeaderHeld(canvasElement, 'サービス')
  await scrollsInsideWithItsHeaderHeld(canvasElement, '開始')
}

export const 収まらないほどのサービスと履歴: Story = {
  args: { result: { state: 'ok', result: MORE_CHANNELS_THAN_FIT } },
  play: async ({ canvasElement }) => {
    await bothListsScrollInside(canvasElement)
  },
}

export const 狭い幅で収まらないほどのサービスと履歴: Story = {
  args: { result: { state: 'ok', result: MORE_CHANNELS_THAN_FIT } },
  parameters: { screen: { width: 768, height: 1024 } },
  play: async ({ canvasElement }) => {
    await bothListsScrollInside(canvasElement)
  },
}

export const スキャン中に収まらないほどの走査結果: Story = {
  args: {
    result: {
      state: 'ok',
      result: {
        ...CHANNELS,
        running: { state: 'read', progress: MORE_ATTEMPTS_THAN_FIT },
      },
    },
  },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, '物理ch')
  },
}

export const 狭い幅でスキャン中に収まらないほどの走査結果: Story = {
  args: {
    result: {
      state: 'ok',
      result: {
        ...CHANNELS,
        running: { state: 'read', progress: MORE_ATTEMPTS_THAN_FIT },
      },
    },
  },
  parameters: { screen: { width: 768, height: 1024 } },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, '物理ch')
  },
}
