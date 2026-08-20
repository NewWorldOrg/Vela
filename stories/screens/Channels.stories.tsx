import { useState, type ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import type { WriteResult } from '@/repository/services'
import { CHANNELS, SCAN_RUNNING } from '@/repository/services.fixtures'
import { AddCandidateDialog } from '@/components/channels/add-candidate-dialog'
import { ChannelsView } from '@/components/channels/channels-page'

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
  args: { result: { state: 'ok', result: CHANNELS }, open: '50001-1024' },
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

export const 取得できないとき: Story = {
  args: {
    result: { state: 'unavailable', message: 'driver に接続できません' },
  },
}

const [service] = CHANNELS.groups[0].services

/** Carries the open state so a dismissal shows up as the dialog going away. */
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
