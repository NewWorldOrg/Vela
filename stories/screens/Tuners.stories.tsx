import type { Meta, StoryObj } from '@storybook/nextjs'
import { afterTheArrival } from '@/stories/after-the-arrival'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'

import type { TunerWriteResult } from '@/repository/tuners'
import { EMPTY_VALUE } from '@/lib/empty-value'
import {
  CARD_READERS,
  DETECTION,
  DETECTION_MISMATCH_ONLY,
  TUNERS,
} from '@/repository/tuners.fixtures'
import { TunersView } from '@/components/tuners/tuners-page'
import { tipIn } from '@/stories/pills-in-a-column'
import { inTheSettings } from '@/stories/frames'
import { PHONE } from '@/stories/rows-as-cards'

const WIDE = { width: 1440, height: 900 }

const LANDSCAPE_PHONE = { width: 844, height: 390 }

function lineOf(canvasElement: HTMLElement, id: string): HTMLElement {
  const line = canvasElement.querySelector<HTMLElement>(
    `[data-slot="hardware-line"][id="${id}"]`,
  )

  if (!line) {
    throw new Error(`no line for ${id}`)
  }

  return line
}

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
    const recording = await tipIn(lineOf(canvasElement, 'adapter1'))

    await expect(recording).toHaveTextContent('57ch')
    await expect(recording).toHaveTextContent('終了予定 08/07 21:15')
    await expect(lineOf(canvasElement, 'adapter3')).toHaveTextContent('53ch')
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
      message: '時間をおいてからもう一度お試しください。',
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
            status: { word: '異常', tone: 'err' },
            state: 'faulted',
            stateLabel: '異常',
            stateSub: TUNED_AND_FAILED,
          },
          {
            ...TUNERS.rows[0],
            id: 'adapter5',
            device: 'adapter5',
            session: undefined,
            status: { word: '異常', tone: 'err' },
            state: 'faulted',
            stateLabel: '異常',
            stateSub: THE_LEDGER_DISAGREES,
          },
          {
            ...TUNERS.rows[0],
            id: 'adapter6',
            device: 'adapter6',
            session: undefined,
            status: { word: '警告', tone: 'warn' },
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

    await expect(canvas.getAllByText('異常')).toHaveLength(2)
    await expect(
      await tipIn(lineOf(canvasElement, 'adapter4')),
    ).toHaveTextContent(TUNED_AND_FAILED)
    await expect(
      await tipIn(lineOf(canvasElement, 'adapter5')),
    ).toHaveTextContent(THE_LEDGER_DISAGREES)
    await expect(canvas.getByText('警告')).toBeVisible()
    await expect(
      await tipIn(lineOf(canvasElement, 'adapter6')),
    ).toHaveTextContent(A_CHANNEL_FAILED)
  },
}

const SATELLITE = 'adapter0'

function withSatellitePower(saved: boolean, applied: boolean) {
  return {
    ...TUNERS,
    notices: [],
    cardReaders: undefined,
    rows: TUNERS.rows
      .filter((row) => row.device === SATELLITE || row.device === 'adapter1')
      .map((row) =>
        row.device === SATELLITE ? { ...row, lnb: { saved, applied } } : row,
      ),
  }
}

function lnbCellOf(canvasElement: HTMLElement, device: string): HTMLElement {
  return lineOf(canvasElement, device)
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
    await expect(
      within(lnbCellOf(canvasElement, 'adapter1')).queryByText('LNB'),
    ).not.toBeInTheDocument()
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
        'driver に接続できないため、保存できませんでした。接続が戻ってからもう一度お試しください。',
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
        'driver に接続できないため、保存できませんでした。接続が戻ってからもう一度お試しください。',
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

    await expect(
      within(cell).getByRole('switch', { name: `${SATELLITE} の LNB 給電` }),
    ).toBeChecked()
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
                label: 'チャンネルへ',
                href: '/settings/channels#system-isdbSBs',
              },
            ],
          },
          {
            tone: 'warn',
            body: 'CS110のサービスが 0 件です。',
            actions: [
              {
                label: 'チャンネルへ',
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
      canvas.getAllByRole('link', { name: 'チャンネルへ' })[0],
    ).toHaveAttribute('href', '/settings/channels#system-isdbSBs')
  },
}

function placeOfParts(line: HTMLElement) {
  const [what, state] = Array.from(
    line.firstElementChild?.children ?? [],
  ) as HTMLElement[]

  return {
    what: what.getBoundingClientRect(),
    state: state.getBoundingClientRect(),
  }
}

export const 電話の幅では状態を名前の下に置く: Story = {
  args: 通常.args,
  parameters: { screen: PHONE },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)
    const { what, state } = placeOfParts(lineOf(canvasElement, 'adapter1'))

    await expect(state.top).toBeGreaterThanOrEqual(what.bottom - 1)
  },
}

export const 広い面では状態を名前の右に置く: Story = {
  args: 通常.args,
  parameters: { screen: WIDE },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)
    const { what, state } = placeOfParts(lineOf(canvasElement, 'adapter1'))

    await expect(state.left).toBeGreaterThanOrEqual(what.right)
  },
}

const A_LONG_TITLE = {
  result: {
    state: 'ok',
    result: {
      ...TUNERS,
      rows: TUNERS.rows.map((row) =>
        row.id === 'adapter1'
          ? {
              ...row,
              status: {
                ...row.status,
                line: 'Example Programme with a title far too long to fit',
              },
            }
          : row,
      ),
    },
  },
} satisfies Story['args']

async function untilStaysWhole(canvasElement: HTMLElement) {
  await afterTheArrival(canvasElement)
  const until = lineOf(canvasElement, 'adapter1').querySelector<HTMLElement>(
    '[data-slot="status-until"]',
  )
  const title = until?.parentElement?.firstElementChild as HTMLElement | null

  await expect(until).toHaveTextContent('21:15 まで')
  await expect(until!.getClientRects()).toHaveLength(1)
  await expect(until!.scrollWidth).toBeLessThanOrEqual(until!.clientWidth)
  await expect(title!.scrollWidth).toBeGreaterThan(title!.clientWidth)
}

export const 番組名が長ければ番組名を省き終わる時刻は分けない: Story = {
  args: A_LONG_TITLE,
  parameters: { screen: WIDE },
  play: async ({ canvasElement }) => untilStaysWhole(canvasElement),
}

export const 電話の幅でも番組名を省き終わる時刻は分けない: Story = {
  args: A_LONG_TITLE,
  parameters: { screen: PHONE },
  play: async ({ canvasElement }) => untilStaysWhole(canvasElement),
}

export const 横向きの電話でも面が狭ければ状態を名前の下に置く: Story = {
  args: 通常.args,
  parameters: { screen: LANDSCAPE_PHONE },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)
    const { what, state } = placeOfParts(lineOf(canvasElement, 'adapter1'))

    await expect(state.top).toBeGreaterThanOrEqual(what.bottom - 1)
  },
}

export const 機械ごとに組を分けカードリーダーをその下に置く: Story = {
  args: {
    result: {
      state: 'ok',
      result: {
        ...TUNERS,
        notices: [],
        rows: [
          ...TUNERS.rows,
          {
            ...TUNERS.rows[0],
            id: 'usb1-2',
            device: 'usb1-2',
            machine: 'study',
            name: 'Example USB tuner',
            place: 'usb 1-2',
            session: undefined,
            status: { word: 'つながらない', tone: 'err', line: '20:12 に確認' },
          },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const titles = Array.from(
      canvasElement.querySelectorAll('section > h2'),
    ).map((title) => title.textContent)

    await expect(titles).toEqual([
      'living-room4 台',
      'カードリーダー',
      'study1 台',
    ])
    await expect(canvas.getByText('つながらない')).toBeVisible()
    await expect(canvas.getByText('Puppis 0.3.7')).toBeVisible()
    await expect(canvas.queryByText(/借り/)).not.toBeInTheDocument()
  },
}

export const 名前の無い機械はこの機械と呼ぶ: Story = {
  args: {
    result: {
      state: 'ok',
      result: {
        ...TUNERS,
        notices: [],
        facts: { ...TUNERS.facts, machine: undefined },
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('heading', { name: /^この機械/ }),
    ).toBeVisible()
  },
}

export const 古いdriverでは名前の代わりに装置のidを出しカードリーダーを出さない: Story =
  {
    args: {
      result: {
        state: 'ok',
        result: {
          ...TUNERS,
          notices: [],
          facts: {},
          cardReaders: undefined,
          rows: TUNERS.rows.map((row) => ({
            ...row,
            name: undefined,
            place: undefined,
          })),
        },
      },
    },
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement)

      await expect(canvas.getByText(`Puppis ${EMPTY_VALUE}`)).toBeVisible()
      await expect(canvas.getAllByText('adapter1')[0]).toBeVisible()
      await expect(
        canvas.queryByRole('heading', { name: 'カードリーダー' }),
      ).not.toBeInTheDocument()
    },
  }

export const カードリーダーの状態: Story = {
  args: {
    result: {
      state: 'ok',
      result: {
        ...TUNERS,
        notices: [],
        cardReaders: [
          ...CARD_READERS,
          {
            id: 'reader-1',
            title: 'Example Dual Reader',
            status: { word: '未挿入', tone: 'warn', line: '20:58 に確認' },
          },
          {
            id: 'reader-2',
            title: 'Example Spare Reader',
            status: {
              word: '応答なし · カードが答えません',
              tone: 'err',
              line: '20:58 に確認',
            },
          },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('挿入')).toBeVisible()
    await expect(canvas.getByText('未挿入')).toBeVisible()
    await expect(
      canvas.getByText('応答なし · カードが答えません'),
    ).toBeVisible()
  },
}

export const pcscdが止まっている: Story = {
  args: {
    result: {
      state: 'ok',
      result: {
        ...TUNERS,
        notices: [],
        cardReaders: [
          {
            id: 'reader-none',
            title: 'カードリーダー',
            status: {
              word: '応答なし · pcscd が止まっています',
              tone: 'err',
              line: '20:58 に確認',
            },
          },
        ],
      },
    },
  },
}
