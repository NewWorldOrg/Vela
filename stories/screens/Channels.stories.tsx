import { useState, type ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'

import type { StartScanResult, WriteResult } from '@/repository/services'
import {
  CHANNELS,
  MORE_ATTEMPTS_THAN_FIT,
  MORE_CHANNELS_THAN_FIT,
  SATELLITE_TUNER_TURNED_OFF,
  SCAN_RUNNING,
  SCAN_RUNNING_ON_A_LATER_BUILD,
} from '@/repository/services.fixtures'
import { AddCandidateDialog } from '@/components/channels/add-candidate-dialog'
import { ChannelsView } from '@/components/channels/channels-page'
import { afterTheArrival } from '@/stories/after-the-arrival'
import { scrollsInsideWithItsHeaderHeld } from '@/stories/scrolls-inside'
import { rowsOfTheTableHeaded, tipIn } from '@/stories/pills-in-a-column'
import { inTheSettings } from '@/stories/frames'

type ChannelsViewProps = ComponentProps<typeof ChannelsView>

const accept = async (): Promise<WriteResult> => ({ state: 'ok' })
const refuseWrite = async (): Promise<WriteResult> => ({
  state: 'rejected',
  message:
    'このスキャンはすでに終わっているため、キャンセルできませんでした。最新の状態を読み直しました。',
})
const answering = (answer: StartScanResult) =>
  fn(async (): Promise<StartScanResult> => answer)

const refuse = answering({
  state: 'refused',
  scanId: 'run-3',
  message:
    'すでにスキャンが実行中です。同時に走らせられるのは 1 本までです。実行中のスキャンを確認するか、キャンセルしてから開始してください。',
})

const meta = {
  title: 'Screens/設定・チャンネル',
  component: ChannelsView,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/settings/channels' },
    },
    layout: 'fullscreen',
  },
  args: {
    onStart: refuse,
    onCancel: accept,
    onSelect: accept,
    onAdd: accept,
    onDelete: accept,
  },
  decorators: [inTheSettings],
} satisfies Meta<typeof ChannelsView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = {
  args: { result: { state: 'ok', result: CHANNELS } },
}

export const サービスの行はSIDを併記する: Story = {
  args: { result: { state: 'ok', result: CHANNELS } },
  play: async ({ canvasElement }) => {
    const rows = CHANNELS.groups.flatMap((group) => group.services)
    const said = [
      ...canvasElement.querySelectorAll('[data-slot="service-id"]'),
    ].map((one) => one.textContent)

    await expect(said).toEqual([
      ...rows.map((row) => `SID ${row.sid}`),
      ...CHANNELS.unattributed.map((row) => `SID ${row.sid}`),
    ])
  },
}

const STARTED: StartScanResult = { state: 'started', scanId: 'run-9' }

export const スキャン範囲は全体と種別と物理ch指定: Story = {
  args: {
    result: { state: 'ok', result: CHANNELS },
    onStart: answering(STARTED),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const range = within(canvas.getByRole('group', { name: 'スキャン範囲' }))

    await expect(
      range.getAllByRole('button').map((one) => one.textContent),
    ).toEqual(['全体', '地上波', 'BS', 'CS110', '物理ch指定'])
    await expect(range.getByRole('button', { name: '地上波' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(canvas.queryByLabelText(/物理チャンネル/)).toBeNull()

    await userEvent.click(range.getByRole('button', { name: '全体' }))
    await userEvent.click(canvas.getByRole('button', { name: 'スキャン開始' }))
    await waitFor(() =>
      expect(args.onStart).toHaveBeenLastCalledWith({ over: 'everything' }),
    )

    await userEvent.click(range.getByRole('button', { name: 'BS' }))
    await userEvent.click(canvas.getByRole('button', { name: 'スキャン開始' }))
    await waitFor(() =>
      expect(args.onStart).toHaveBeenLastCalledWith({
        over: 'systems',
        systems: ['isdbSBs'],
      }),
    )
  },
}

export const 物理chを指定してスキャンする: Story = {
  args: {
    result: { state: 'ok', result: CHANNELS },
    onStart: answering(STARTED),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const range = within(canvas.getByRole('group', { name: 'スキャン範囲' }))
    const start = canvas.getByRole('button', { name: 'スキャン開始' })

    await userEvent.click(range.getByRole('button', { name: '物理ch指定' }))

    const channel = canvas.getByLabelText(/物理チャンネル/)

    await expect(canvas.queryByLabelText(/TSID/)).toBeNull()

    await userEvent.click(start)
    await expect(
      await canvas.findByText('物理チャンネルを半角数字で入力してください。'),
    ).toBeVisible()
    await expect(args.onStart).not.toHaveBeenCalled()

    await userEvent.type(channel, '12')
    await userEvent.click(start)
    await expect(
      await canvas.findByText('地上波の物理チャンネルは 13 〜 62 です。'),
    ).toBeVisible()
    await expect(args.onStart).not.toHaveBeenCalled()

    await userEvent.clear(channel)
    await userEvent.type(channel, '21')
    await userEvent.click(start)
    await waitFor(() =>
      expect(args.onStart).toHaveBeenLastCalledWith({
        over: 'channels',
        channels: [
          {
            system: 'isdbT',
            physicalChannel: 21,
            transportStreamId: undefined,
          },
        ],
      }),
    )

    await userEvent.click(
      within(canvas.getByRole('group', { name: '方式' })).getByRole('button', {
        name: 'BS',
      }),
    )
    await userEvent.clear(channel)
    await userEvent.type(channel, '15')
    await userEvent.type(canvas.getByLabelText(/TSID/), '16625')
    await userEvent.click(start)
    await waitFor(() =>
      expect(args.onStart).toHaveBeenLastCalledWith({
        over: 'channels',
        channels: [
          { system: 'isdbSBs', physicalChannel: 15, transportStreamId: 16625 },
        ],
      }),
    )

    const bar = start.closest('div') as HTMLElement
    const fields = channel.closest('[data-slot="field"]') as HTMLElement

    await expect(fields.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      start.getBoundingClientRect().top,
    )
    await expect(bar.scrollWidth).toBeLessThanOrEqual(bar.clientWidth)
  },
}

const TUNING_NOT_TAKEN =
  '物理チャンネルの指定が受け付けられませんでした。値を確かめてください。'

export const 物理chの指定を断られたとき: Story = {
  args: {
    result: { state: 'ok', result: CHANNELS },
    onStart: answering({ state: 'rejected', message: TUNING_NOT_TAKEN }),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const range = within(canvas.getByRole('group', { name: 'スキャン範囲' }))

    await userEvent.click(range.getByRole('button', { name: '物理ch指定' }))
    await userEvent.type(canvas.getByLabelText(/物理チャンネル/), '27')
    await userEvent.click(canvas.getByRole('button', { name: 'スキャン開始' }))

    await expect(await canvas.findByText(TUNING_NOT_TAKEN)).toBeVisible()
    await expect(args.onStart).toHaveBeenCalledTimes(1)
    await expect(canvas.getByLabelText(/物理チャンネル/)).toHaveValue('27')
  },
}

export const 候補を開いた状態: Story = {
  args: { result: { state: 'ok', result: CHANNELS } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: 'みなと総合1 の候補チャンネル' }),
    )
    await afterTheArrival(canvasElement)

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
    await afterTheArrival(canvasElement)

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
    await afterTheArrival(canvasElement)

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
    await expect(fold.transitionDuration).toBe('0.2s')
    await expect(fold.transitionTimingFunction).toBe(
      'cubic-bezier(0.25, 0.1, 0.45, 1)',
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

export const スキャン中にこの版の知らない結果: Story = {
  args: {
    result: {
      state: 'ok',
      result: {
        ...CHANNELS,
        running: { state: 'read', progress: SCAN_RUNNING_ON_A_LATER_BUILD },
      },
    },
  },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)

    const rows = rowsOfTheTableHeaded(canvasElement, '物理ch')
    const [row] = rows
    const marks = rows.map((each) => {
      const mark = each.querySelector<HTMLElement>(
        'td:nth-child(2) > span > span:first-child',
      )

      if (!mark) {
        throw new Error('a result is drawn without its mark')
      }

      return mark
    })

    await expect(within(row).getByText('この版がまだ知らない値')).toBeVisible()
    await expect(within(row).queryByText('サービスを取得')).toBeNull()
    await expect(
      new Set(marks.map((mark) => Math.round(mark.getBoundingClientRect().x)))
        .size,
    ).toBe(1)
    await expect(
      new Set(
        marks.map((mark) => Math.round(mark.getBoundingClientRect().width)),
      ).size,
    ).toBe(1)
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

const SATELLITE_TURNED_OFF = {
  ...CHANNELS,
  groups: CHANNELS.groups.map((group) =>
    group.system === 'isdbSBs'
      ? {
          ...group,
          services: [SATELLITE_TUNER_TURNED_OFF],
          stat: '1 サービス(TV 1)',
          diagnosis: undefined,
        }
      : group,
  ),
}

export const 受信できるチューナーのない種別は受信不可: Story = {
  args: { result: { state: 'ok', result: SATELLITE_TURNED_OFF } },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)

    const bs = canvasElement.querySelector<HTMLElement>('#system-isdbSBs')

    if (!bs) {
      throw new Error('no BS group')
    }

    const said = within(bs).getByText('受信不可')

    await expect(said).toBeVisible()
    await expect(within(bs).queryByText('要対応')).not.toBeInTheDocument()
    await expect((await tipIn(bs)).textContent).toContain(
      'この種別を受信できる有効なチューナーがない状態。',
    )

    const ground = canvasElement.querySelector<HTMLElement>('#system-isdbT')

    await expect(
      within(ground as HTMLElement).queryByText('受信不可'),
    ).not.toBeInTheDocument()
  },
}
