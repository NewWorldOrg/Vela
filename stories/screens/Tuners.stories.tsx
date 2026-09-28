import type { Meta, StoryObj } from '@storybook/nextjs'
import { afterTheArrival } from '@/stories/after-the-arrival'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'

import type { TunerWriteResult } from '@/repository/tuners'
import { EMPTY_VALUE } from '@/lib/empty-value'
import {
  DETECTION,
  DETECTION_MISMATCH_ONLY,
  TUNERS,
} from '@/repository/tuners.fixtures'
import { TunersView } from '@/components/tuners/tuners-page'
import {
  cellOf,
  rowsOfTheTableHeaded,
  tipIn,
} from '@/stories/pills-in-a-column'
import { inTheSettings } from '@/stories/frames'

const SESSION_COLUMN = 3

const STATE_COLUMN = 4

const meta = {
  title: 'Screens/設定・チューナー',
  component: TunersView,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/settings/tuners' },
    },
    layout: 'fullscreen',
  },
  args: {
    onToggle: async () => ({ state: 'ok' }),
    onRestart: async () => ({ state: 'disconnected' }),
    onDismiss: async () => {},
    onSaveDetection: async () => ({ state: 'ok' }),
    onSaveThreshold: async () => ({ state: 'ok' }),
    onSaveLnb: async (): Promise<TunerWriteResult> => ({ state: 'ok' }),
  },
  decorators: [inTheSettings],
} satisfies Meta<typeof TunersView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = {
  args: { result: { state: 'ok', result: TUNERS } },
}

export const 進行中のセッションが物理選局値で分かる: Story = {
  args: { result: { state: 'ok', result: TUNERS } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const rows = rowsOfTheTableHeaded(canvasElement, 'デバイス')
    const said = await Promise.all(
      rows
        .filter((row) =>
          cellOf(row, SESSION_COLUMN).querySelector(
            '[data-slot="tooltip-trigger"], [data-state-say], [data-slot="badge"]',
          ),
        )
        .map(
          async (row) =>
            (await tipIn(cellOf(row, SESSION_COLUMN))).textContent ?? '',
        ),
    )

    await expect(said.join(' ')).toContain('57ch')
    await expect(said.join(' ')).toContain('53ch')
    await expect(said.join(' ')).toContain('終了予定 08/07 21:15')
  },
}

export const 異常なし: Story = {
  args: {
    result: {
      state: 'ok',
      result: {
        ...TUNERS,
        notices: [],
        rows: TUNERS.rows.filter((row) => row.state !== 'faulted'),
      },
    },
  },
}

export const 検出_差分あり: Story = {
  args: {
    result: { state: 'ok', result: TUNERS },
    detection: { state: 'ok', detection: DETECTION },
  },
}

export const 検出_差分なし: Story = {
  args: {
    result: { state: 'ok', result: TUNERS },
    detection: {
      state: 'ok',
      detection: { detected: [], rows: [], changes: false },
    },
  },
}

export const 検出_種別相違のみ: Story = {
  args: {
    result: { state: 'ok', result: TUNERS },
    detection: { state: 'ok', detection: DETECTION_MISMATCH_ONLY },
  },
}

export const 検出できない: Story = {
  args: {
    result: { state: 'ok', result: TUNERS },
    detection: {
      state: 'unavailable',
      message: 'driver に接続できませんでした。',
    },
  },
}

export const 未設定: Story = {
  args: {
    result: { state: 'ok', result: { ...TUNERS, notices: [], rows: [] } },
  },
}

export const 未設定から検出: Story = {
  args: {
    result: { state: 'ok', result: { ...TUNERS, notices: [], rows: [] } },
    detection: { state: 'ok', detection: DETECTION },
  },
}

export const driver未接続: Story = {
  args: {
    result: {
      state: 'ok',
      result: { ...TUNERS, connection: 'disconnected', instanceId: undefined },
    },
  },
}

export const driver状態不明: Story = {
  args: {
    result: {
      state: 'ok',
      result: { ...TUNERS, connection: 'unknown', instanceId: undefined },
    },
  },
}

export const サインインしていない: Story = {
  args: { result: { state: 'unauthenticated' } },
}

export const 再起動中で読めない: Story = {
  args: {
    result: {
      state: 'unavailable',
      message: 'しばらくしてからもう一度試してください。',
    },
    restartWindow: {
      state: 'restarting',
      deadline: Date.now() + 60 * 60 * 1000,
      budgetSeconds: 30,
    },
  },
}

export const 状態を取得できない: Story = {
  args: {
    result: {
      state: 'unavailable',
      message: 'driver に接続できませんでした。',
    },
  },
}

const TUNED_AND_FAILED =
  '同じチャンネルで続けて選局できなかった。driver を起動し直すまで割り当てられない。'

const THE_LEDGER_DISAGREES =
  '一覧では地上波、このチューナーが受信できるのは衛星。一致するまで割り当てられない。'

const A_CHANNEL_FAILED =
  '選局に失敗したチャンネルがある。同じチャンネルで続けて失敗すると割り当てが止まる。'

export const 異常と警告は理由を画面の語で出す: Story = {
  args: {
    result: {
      state: 'ok',
      result: {
        ...TUNERS,
        notices: [],
        rows: [
          {
            ...TUNERS.rows[0],
            id: 'adapter4',
            device: 'adapter4',
            session: undefined,
            idleLabel: '割当停止中',
            state: 'faulted',
            stateLabel: '異常',
            stateSub: TUNED_AND_FAILED,
          },
          {
            ...TUNERS.rows[0],
            id: 'adapter5',
            device: 'adapter5',
            session: undefined,
            idleLabel: '割当停止中',
            state: 'faulted',
            stateLabel: '異常',
            stateSub: THE_LEDGER_DISAGREES,
          },
          {
            ...TUNERS.rows[0],
            id: 'adapter6',
            device: 'adapter6',
            session: undefined,
            idleLabel: 'アイドル',
            state: 'warn',
            stateLabel: '警告',
            stateSub: A_CHANNEL_FAILED,
          },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)
    const canvas = within(canvasElement)

    const rows = rowsOfTheTableHeaded(canvasElement, 'デバイス')

    await expect(canvas.getAllByText('異常')).toHaveLength(2)
    await expect(await tipIn(cellOf(rows[0], STATE_COLUMN))).toHaveTextContent(
      TUNED_AND_FAILED,
    )
    await expect(await tipIn(cellOf(rows[1], STATE_COLUMN))).toHaveTextContent(
      THE_LEDGER_DISAGREES,
    )
    await expect(canvas.getByText('警告')).toBeVisible()
    await expect(await tipIn(cellOf(rows[2], STATE_COLUMN))).toHaveTextContent(
      A_CHANNEL_FAILED,
    )
  },
}

const SATELLITE = 'adapter0'

const LNB_COLUMN = 6

function withSatellitePower(saved: boolean, applied: boolean) {
  return {
    ...TUNERS,
    notices: [],
    rows: TUNERS.rows.map((row) =>
      row.device === SATELLITE ? { ...row, lnb: { saved, applied } } : row,
    ),
  }
}

function lnbCellOf(canvasElement: HTMLElement, device: string): HTMLElement {
  const row = rowsOfTheTableHeaded(canvasElement, 'デバイス').find(
    (one) => one.id === device,
  )

  if (!row) {
    throw new Error(`no row for ${device}`)
  }

  return cellOf(row, LNB_COLUMN)
}

export const LNB給電は衛星の行だけで切り替えられる: Story = {
  args: { result: { state: 'ok', result: withSatellitePower(false, false) } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getAllByRole('switch', { name: /の LNB 給電$/ }),
    ).toHaveLength(1)
    await expect(
      within(lnbCellOf(canvasElement, SATELLITE)).getByRole('switch', {
        name: `${SATELLITE} の LNB 給電`,
      }),
    ).not.toBeChecked()
    await expect(lnbCellOf(canvasElement, 'adapter1')).toHaveTextContent(
      EMPTY_VALUE,
    )
  },
}

export const LNB給電をオンにするときは確かめてから保存する: Story = {
  args: {
    result: { state: 'ok', result: withSatellitePower(false, false) },
    onSaveLnb: fn(async () => ({ state: 'ok' as const })),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const power = canvas.getByRole('switch', {
      name: `${SATELLITE} の LNB 給電`,
    })

    await userEvent.click(power)

    const asked = await screen.findByRole('alertdialog')

    await expect(
      within(asked).getByText('LNB 給電をオンにします'),
    ).toBeVisible()
    await expect(
      within(asked).getByText(`${SATELLITE} からアンテナ線へ給電します。`),
    ).toBeVisible()

    await userEvent.click(
      within(asked).getByRole('button', { name: 'キャンセル' }),
    )

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    )
    await expect(args.onSaveLnb).not.toHaveBeenCalled()

    await userEvent.click(power)
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'オンにする',
      }),
    )

    await waitFor(() =>
      expect(args.onSaveLnb).toHaveBeenCalledWith(SATELLITE, true),
    )
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    )
  },
}

export const LNB給電の確認で断られたら閉じずに理由を出す: Story = {
  args: {
    result: { state: 'ok', result: withSatellitePower(false, false) },
    onSaveLnb: async () => ({
      state: 'rejected' as const,
      message:
        'driver に接続できないため、保存できませんでした。接続が戻ってから試してください。',
    }),
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('switch', {
        name: `${SATELLITE} の LNB 給電`,
      }),
    )

    const asked = await screen.findByRole('alertdialog')

    await userEvent.click(
      within(asked).getByRole('button', { name: 'オンにする' }),
    )

    await expect(
      await within(asked).findByText(
        'driver に接続できないため、保存できませんでした。接続が戻ってから試してください。',
      ),
    ).toBeVisible()
    await expect(screen.getByRole('alertdialog')).toBeVisible()
  },
}

export const LNB給電をオフにするときは確かめない: Story = {
  args: {
    result: { state: 'ok', result: withSatellitePower(true, true) },
    onSaveLnb: fn(async () => ({ state: 'ok' as const })),
  },
  play: async ({ canvasElement, args }) => {
    const power = within(canvasElement).getByRole('switch', {
      name: `${SATELLITE} の LNB 給電`,
    })

    await expect(power).toBeChecked()

    await userEvent.click(power)

    await waitFor(() =>
      expect(args.onSaveLnb).toHaveBeenCalledWith(SATELLITE, false),
    )
    await expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  },
}

export const LNB給電を保存して未反映: Story = {
  args: {
    result: {
      state: 'ok',
      result: {
        ...withSatellitePower(true, false),
        notices: [
          {
            tone: 'warn',
            body: '保存済み・未反映の変更があります。',
            restart: { recordings: 0 },
          },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)

    const cell = lnbCellOf(canvasElement, SATELLITE)

    await expect(within(cell).getByRole('switch')).toBeChecked()
    await expect(within(cell).getByText('未反映')).toBeVisible()
    await expect(lnbCellOf(canvasElement, 'adapter1')).not.toHaveTextContent(
      '未反映',
    )
  },
}

export const サービスが0件の種別を最上部で言う: Story = {
  args: {
    result: {
      state: 'ok',
      result: {
        ...TUNERS,
        notices: [
          {
            tone: 'warn',
            body: 'BSのサービスが 0 件です。',
            actions: [
              {
                label: '切り分けを見る',
                href: '/settings/channels#system-isdbSBs',
              },
            ],
          },
          {
            tone: 'warn',
            body: 'CS110のサービスが 0 件です。',
            actions: [
              {
                label: '切り分けを見る',
                href: '/settings/channels#system-isdbSCs110',
              },
            ],
          },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await afterTheArrival(canvasElement)
    await expect(canvas.getByText('BSのサービスが 0 件です。')).toBeVisible()
    await expect(
      canvas.getAllByRole('link', { name: '切り分けを見る' })[0],
    ).toHaveAttribute('href', '/settings/channels#system-isdbSBs')
  },
}
