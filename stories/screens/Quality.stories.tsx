import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  A_WEEK,
  EVERY_ROW_UNMEASURED,
  MORE_TUNERS_THAN_FIT,
  NOTHING_MEASURED,
  ONE_RECORDING_IN_A_DAY,
  OVER_THE_LINE,
  QUALITY,
  SATELLITES_FAILING_TO_TUNE,
  SATELLITES_THAT_CANNOT_LOCK,
  TWO_BROADCAST_DAYS,
} from '@/repository/quality.fixtures'
import { QualityView } from '@/components/quality/quality-page'
import type { QualitySaveThresholds } from '@/components/quality/threshold-panel'
import {
  rowsOfTheTableHeaded,
  saysItWithoutAnEdge,
} from '@/stories/pills-in-a-column'
import { scrollsInsideWithItsHeaderHeld } from '@/stories/scrolls-inside'
import { inTheSettings } from '@/stories/frames'

const REFUSED =
  '警告水準が視聴不可の恐れを越えてしまうため、変更できませんでした。'

const saveThresholds = fn<QualitySaveThresholds>(async (writes) =>
  writes.map((one) => ({ key: one.key, write: { state: 'ok' } })),
)

const refusesTheLockRate = fn<QualitySaveThresholds>(async (writes) =>
  writes.map((one) => ({
    key: one.key,
    write:
      one.key === 'lockRate'
        ? { state: 'rejected', message: REFUSED }
        : { state: 'ok' },
  })),
)

const signedOutOnTheFirst = fn<QualitySaveThresholds>(async (writes) => [
  { key: writes[0].key, write: { state: 'unauthenticated' } },
])

const rowOf = (input: HTMLElement) =>
  within(input.closest<HTMLElement>('[data-slot="threshold-row"]')!)

const retyped = async (input: HTMLElement, text: string) => {
  await userEvent.clear(input)
  await userEvent.type(input, text)
}

const meta = {
  title: 'Screens/設定・品質',
  component: QualityView,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/settings/quality' },
    },
    layout: 'fullscreen',
  },
  args: {
    onSaveThresholds: saveThresholds,
  },
  decorators: [inTheSettings],
} satisfies Meta<typeof QualityView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = { args: { result: QUALITY } }

export const 問題のある録画の欠け: Story = {
  args: { result: QUALITY },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const rowOf = (title: string) =>
      within(canvas.getByText(title).closest('div.border-b') as HTMLElement)
    const packetChip = (row: ReturnType<typeof rowOf>, reading: string) =>
      row.getByText(reading).parentElement?.nextElementSibling
    const gapChip = (row: ReturnType<typeof rowOf>, reading: string) =>
      row.getByText(reading).nextElementSibling

    const gapOnly = rowOf('週末の旅ノート')

    await expect(packetChip(gapOnly, 'ドロップ 0')).toHaveTextContent('良好')
    await expect(gapChip(gapOnly, '欠け 2 回 · 12.4 秒')).toHaveTextContent(
      '警告水準',
    )

    const noGap = rowOf('みなと ニュース7')

    await expect(packetChip(noGap, 'ドロップ 3,842')).toHaveTextContent(
      '視聴不可の恐れ',
    )
    await expect(gapChip(noGap, '欠け 0 回 · 0.0 秒')).toHaveTextContent('良好')

    const chips = [
      packetChip(noGap, 'ドロップ 3,842'),
      gapChip(noGap, '欠け 0 回 · 0.0 秒'),
    ].map((one) => one?.getBoundingClientRect().left)

    await expect(chips[0]).toBe(chips[1])
  },
}

export const 電波を掴めないチューナーの異常: Story = {
  args: { result: QUALITY },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('チューナーが電波を掴めない')).toBeVisible()
    await expect(
      canvas.getByText('adapter1.frontend0 · 観測 3 回続けて失敗'),
    ).toBeVisible()
    await expect(canvas.getByText('分類 受信不可')).toBeVisible()
    await expect(canvas.queryByText('NoLock')).toBeNull()
  },
}

export const 何も計測されていない: Story = {
  args: { result: NOTHING_MEASURED },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByText('解消していない異常はありません。'),
    ).toBeVisible()
    await expect(
      canvas.getByText('期間内に地上波の録画がありません。'),
    ).toBeVisible()
    await expect(
      canvas.getByText('期間内に BS / CS の録画がありません。'),
    ).toBeVisible()
    await expect(
      canvas.getByText('期間内に録画したチューナーがありません。'),
    ).toBeVisible()

    const moods = [
      ...canvasElement.querySelectorAll<SVGSVGElement>(
        '[data-slot="empty-state"] [data-slot="usher"]',
      ),
    ].map((usher) => usher.dataset.mood)

    await expect(moods.filter((mood) => mood === 'plain').length).toBe(3)
    await expect(moods.filter((mood) => mood === 'glad').length).toBe(2)
    await expect(moods.length).toBe(5)
  },
}

export const 移行直後で全面未計測: Story = {
  args: { result: EVERY_ROW_UNMEASURED },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    for (const label of [
      '直近 24 時間のドロップ率',
      '問題のある録画',
      'スクランブル残存率',
      'チューナーヘルス',
    ]) {
      const tile = canvas
        .getAllByText(label)
        .find((one) => one.closest('[data-slot="section-heading"]') === null)

      await expect(tile?.closest('[data-slot="surface"]')).toHaveTextContent(
        '未計測',
      )
    }

    await expect(canvas.queryByText('良好')).toBeNull()
    await expect(canvas.queryByText('警告水準')).toBeNull()
    await expect(canvas.queryByText('0')).toBeNull()

    const meters = [...canvasElement.querySelectorAll('[data-slot="meter"]')]

    await expect(meters.length).toBe(6)
    await expect(
      meters.every((one) => one.getAttribute('data-level') === 'unmeasured'),
    ).toBe(true)
    await expect(
      canvasElement.querySelectorAll('[data-slot="meter-fill"]').length,
    ).toBe(0)

    await expect(canvas.getAllByRole('row').length).toBe(5)
    await expect(
      canvas.queryByText('期間内に録画したチューナーがありません。'),
    ).toBeNull()

    const whole = canvas.getByRole('img', { name: '全体の推移' })

    await expect(whole.querySelector('[data-level="good"]')).toBeNull()
    await expect(
      whole.querySelectorAll('[data-level="unmeasured"]').length,
    ).toBe(24)
  },
}

export const 一部だけ未計測: Story = {
  args: { result: QUALITY },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('計測の供給が途絶しています')).toBeVisible()
    await expect(canvas.getByText('録画 11 件を計測')).toBeVisible()
    await expect(canvas.getAllByText('良好').length).toBeGreaterThan(0)
    await expect(canvas.getAllByText('未計測').length).toBeGreaterThan(0)
    await expect(
      canvasElement.querySelectorAll('[data-slot="meter-fill"]').length,
    ).toBeGreaterThan(0)
  },
}

export const 閾値をまとめて変更: Story = {
  args: { result: QUALITY },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)

    await expect(canvas.queryAllByRole('textbox')).toHaveLength(0)
    await userEvent.click(canvas.getByRole('button', { name: '変更' }))

    const warning = canvas.getByLabelText('ドロップ率の警告水準')

    await expect(canvas.getAllByRole('textbox')).toHaveLength(9)
    await expect(warning).toHaveFocus()
    await expect(warning).toHaveValue('0.02')
    await expect(canvas.getByRole('button', { name: '保存' })).toBeDisabled()

    await retyped(warning, '0.02')
    await expect(canvas.getByRole('button', { name: '保存' })).toBeDisabled()

    await retyped(warning, '0.5')
    await retyped(canvas.getByLabelText('ドロップ率の視聴不可の恐れ'), '1')
    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    await waitFor(() =>
      expect(args.onSaveThresholds).toHaveBeenCalledWith([
        { kind: 'revise', key: 'packetsLostUnwatchable', amount: 1 },
        { kind: 'revise', key: 'packetsLostWarning', amount: 0.5 },
      ]),
    )
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: '変更' })).toHaveFocus(),
    )
    await expect(canvas.getByText('保存しました。')).toBeVisible()
    await expect(canvas.queryAllByRole('textbox')).toHaveLength(0)
  },
}

export const 閾値の誤りは行ごとに出る: Story = {
  args: { result: QUALITY },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '変更' }))

    const lock = canvas.getByLabelText('lock 率の下限')
    const warning = canvas.getByLabelText('ドロップ率の警告水準')

    await retyped(lock, '101')
    await retyped(warning, '0.5')
    await expect(rowOf(lock).queryByText('値は 0 〜 100% です。')).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    await expect(rowOf(lock).getByText('値は 0 〜 100% です。')).toBeVisible()
    await expect(lock).toHaveAttribute('aria-invalid', 'true')
    await expect(
      rowOf(warning).getByText(
        '値は ドロップ率の視聴不可の恐れ(0.1%)以下です。',
      ),
    ).toBeVisible()
    await expect(args.onSaveThresholds).not.toHaveBeenCalled()

    await retyped(lock, '98')
    await expect(rowOf(lock).queryByText('値は 0 〜 100% です。')).toBeNull()
  },
}

export const 閾値の一部を断られる: Story = {
  args: { result: QUALITY, onSaveThresholds: refusesTheLockRate },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '変更' }))

    const overflows = canvas.getByLabelText('取りこぼしの上限')
    const lock = canvas.getByLabelText('lock 率の下限')

    await retyped(overflows, '5')
    await retyped(lock, '95')
    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(rowOf(lock).getByText(REFUSED)).toBeVisible())
    await expect(rowOf(overflows).getByText('保存しました。')).toBeVisible()
    await expect(lock).toHaveValue('95')
    await expect(canvas.getByRole('button', { name: '保存' })).toBeVisible()
  },
}

export const 閾値の保存でサインインが切れる: Story = {
  args: { result: QUALITY, onSaveThresholds: signedOutOnTheFirst },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '変更' }))
    await retyped(canvas.getByLabelText('lock 率の下限'), '95')
    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    await waitFor(() =>
      expect(
        canvas.getByText('サインインが切れているため、保存できませんでした。'),
      ).toBeVisible(),
    )
  },
}

export const 閾値の変更をキャンセル: Story = {
  args: { result: QUALITY },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '変更' }))
    await retyped(canvas.getByLabelText('lock 率の下限'), '95')
    await userEvent.click(canvas.getByRole('button', { name: 'キャンセル' }))

    await expect(canvas.queryAllByRole('textbox')).toHaveLength(0)
    await expect(args.onSaveThresholds).not.toHaveBeenCalled()

    await userEvent.click(canvas.getByRole('button', { name: '変更' }))
    await expect(canvas.getByLabelText('lock 率の下限')).toHaveValue('99')
  },
}

export const 閾値の出どころ: Story = {
  args: { result: QUALITY },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const measured = canvas.getByText('CNR の下限').parentElement!

    await expect(within(measured).getByText('実測')).toBeVisible()
    await expect(
      within(measured).getByText(
        'セッション 240 件(ドロップ 18 件)· 09/01〜09/07',
      ),
    ).toBeVisible()

    const byHand = canvas.getByText(
      'post-Viterbi ビット誤り率の上限',
    ).parentElement!

    await expect(within(byHand).getByText('手動設定')).toBeVisible()
    await expect(
      within(byHand).getByText('実測 3.0e-3 · 既定 1.0e-4'),
    ).toBeVisible()

    const shipped = canvas.getByText('lock 率の下限').parentElement!

    await expect(within(shipped).queryByText('実測')).toBeNull()
    await expect(within(shipped).queryByText('手動設定')).toBeNull()
  },
}

export const 手動設定を解除: Story = {
  args: { result: QUALITY },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '変更' }))

    const ceiling = canvas.getByLabelText('post-Viterbi ビット誤り率の上限')
    const row = rowOf(ceiling)

    await expect(
      rowOf(canvas.getByLabelText('lock 率の下限')).queryByRole('button'),
    ).toBeNull()

    await userEvent.click(row.getByRole('button', { name: '手動設定を解除' }))
    await expect(ceiling).toBeDisabled()
    await expect(ceiling).toHaveValue('0.003')

    await userEvent.click(row.getByRole('button', { name: '取り消し' }))
    await expect(ceiling).toBeEnabled()
    await expect(ceiling).toHaveValue('0.005')

    await userEvent.click(row.getByRole('button', { name: '手動設定を解除' }))
    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    await waitFor(() =>
      expect(args.onSaveThresholds).toHaveBeenCalledWith([
        { kind: 'release', key: 'bitErrorRateCeiling' },
      ]),
    )
  },
}

export const 局とチューナーの組の異常: Story = {
  args: { result: QUALITY },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByText(/みなと総合1 · adapter0\.frontend0 · 観測 17\.2 dB/),
    ).toBeVisible()
  },
}

export const 収まらないほどのチューナー: Story = {
  args: { result: MORE_TUNERS_THAN_FIT },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, 'チューナー')
  },
}

export const 狭い幅で収まらないほどのチューナー: Story = {
  args: { result: MORE_TUNERS_THAN_FIT },
  parameters: { screen: { width: 768, height: 1024 } },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, 'チューナー')
  },
}

export const 推移: Story = {
  args: { result: QUALITY },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const subjects = canvas.getByRole('group', { name: '対象' })

    await expect(
      within(subjects).getByRole('link', { name: 'CNR' }),
    ).toHaveAttribute('aria-current', 'page')
    await expect(
      canvas.getByRole('img', { name: '全体の推移' }),
    ).toBeInTheDocument()

    const quiet = canvas.getByRole('img', { name: 'みなと教育1の推移' })

    await expect(quiet.querySelector('[data-level="good"]')).toBeNull()
    await expect(quiet.querySelectorAll('[data-level="nodata"]').length).toBe(
      24,
    )
  },
}

const trendPanel = (canvasElement: HTMLElement) =>
  canvasElement
    .querySelector('[aria-label="全体の推移"]')
    ?.closest<HTMLElement>('[data-slot="surface"]') ?? canvasElement

const middleOf = (element: Element) => {
  const box = element.getBoundingClientRect()

  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

export const 録画が1本だけの24時間: Story = {
  args: { result: ONE_RECORDING_IN_A_DAY },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const whole = canvas.getByRole('img', { name: '全体の推移' })

    await expect(whole.querySelectorAll('[data-slot="step"]').length).toBe(2)
    await expect(whole.querySelectorAll('[data-slot="riser"]').length).toBe(1)
    await expect(whole.querySelector('[data-over]')).toBeNull()
    await expect(
      whole.querySelector('[data-slot="threshold"]'),
    ).toBeInTheDocument()

    const quiet = canvas.getByRole('img', { name: '中央テレビ1の推移' })

    await expect(quiet.querySelectorAll('[data-slot="step"]').length).toBe(0)
    await expect(quiet.querySelectorAll('[data-level="nodata"]').length).toBe(
      24,
    )
    await expect(canvas.queryByText('暫定')).toBeNull()
  },
}

export const 閾値を越えた刻みがある: Story = {
  args: { result: OVER_THE_LINE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const whole = canvas.getByRole('img', { name: '全体の推移' })

    await expect(whole.querySelectorAll('[data-slot="step"]').length).toBe(12)
    await expect(whole.querySelectorAll('[data-over]').length).toBe(2)
    await expect(whole.querySelectorAll('[data-slot="riser"]').length).toBe(8)

    const labels = within(trendPanel(canvasElement)).getAllByText('0.02%')
    const lines = canvasElement.querySelectorAll('[data-slot="threshold"]')

    await expect(labels.length).toBe(3)
    await expect(lines.length).toBe(3)

    for (const [index, label] of labels.entries()) {
      await expect(
        Math.abs(middleOf(label).y - middleOf(lines[index]).y),
      ).toBeLessThan(1.5)
    }
  },
}

export const 放送日の刻みが2つだけの24時間: Story = {
  args: { result: TWO_BROADCAST_DAYS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const whole = canvas.getByRole('img', { name: '全体の推移' })
    const [step] = whole.querySelectorAll('[data-slot="step"]')
    const box = whole.getBoundingClientRect()
    const drawn = step.getBoundingClientRect()

    await expect(whole.querySelectorAll('[data-slot="step"]').length).toBe(1)
    await expect(Math.abs(drawn.left - box.left)).toBeLessThan(2)
    await expect(
      Math.abs(drawn.right - (box.left + (box.width * 15.35) / 24)),
    ).toBeLessThan(2)
    await expect(whole.querySelectorAll('title').length).toBe(2)

    const quiet = canvas.getByRole('img', { name: '中央テレビ1の推移' })

    await expect(quiet.querySelectorAll('[data-slot="step"]').length).toBe(0)
  },
}

export const 推移_7日: Story = {
  args: { result: A_WEEK },
  play: async ({ canvasElement }) => {
    const panel = within(trendPanel(canvasElement))
    const whole = panel.getByRole('img', { name: '全体の推移' })
    const rules = [...whole.querySelectorAll('line[stroke-dasharray="1 3"]')]

    await expect(rules.length).toBe(7)
    await expect(panel.getByText('09/01 14:00')).toBeVisible()
    await expect(panel.getByText('09/08 14:00')).toBeVisible()

    for (const [day, rule] of [
      ['09/04', rules[2]],
      ['09/05', rules[3]],
      ['09/06', rules[4]],
    ] as const) {
      const label = panel.getByText(day)

      await expect(label.getBoundingClientRect().width).toBeGreaterThan(0)
      await expect(Math.abs(middleOf(label).x - middleOf(rule).x)).toBeLessThan(
        1.5,
      )
    }
  },
}

const TUNER_STATE_COLUMN = 1

export const 札の並び: Story = {
  args: { result: QUALITY },
  play: async ({ canvasElement }) => {
    const rows = rowsOfTheTableHeaded(canvasElement, 'チューナー')

    await expect(rows.length).toBeGreaterThan(1)
    await saysItWithoutAnEdge(rows, TUNER_STATE_COLUMN)
  },
}

export const 受信不可のチューナーと録画の無い信号の警告: Story = {
  args: { result: SATELLITES_THAT_CANNOT_LOCK },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const tile = canvas
      .getAllByText('チューナーヘルス')
      .find((one) => one.closest('[data-slot="section-heading"]') === null)
      ?.closest('[data-slot="surface"]')

    await expect(tile).toHaveTextContent('0 / 3')
    await expect(tile).toHaveTextContent('受信不可 2 本')
    await expect(tile).not.toHaveTextContent('対象なし')

    const rows = rowsOfTheTableHeaded(canvasElement, 'チューナー')

    await expect(
      rows.map(
        (row) => row.querySelectorAll('td')[TUNER_STATE_COLUMN]?.textContent,
      ),
    ).toEqual(['受信不可', '受信不可', '警告水準'])
  },
}

export const 選局の失敗が続く衛星チューナー: Story = {
  args: { result: SATELLITES_FAILING_TO_TUNE },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const tile = canvas
      .getAllByText('チューナーヘルス')
      .find((one) => one.closest('[data-slot="section-heading"]') === null)
      ?.closest('[data-slot="surface"]')

    await expect(tile).toHaveTextContent('選局失敗 2 本')

    const rows = rowsOfTheTableHeaded(canvasElement, 'チューナー')

    await expect(
      rows.map(
        (row) => row.querySelectorAll('td')[TUNER_STATE_COLUMN]?.textContent,
      ),
    ).toEqual(['選局失敗', '選局失敗', '健全'])

    const tip = rows[0]
      .querySelectorAll('td')
      [TUNER_STATE_COLUMN]?.querySelector('[data-slot="term-tip"]')

    await expect(tip).not.toBeNull()

    await expect(
      canvas.getByText('チューナーの選局が失敗している'),
    ).toBeVisible()
    await expect(canvas.getByText(/分類 選局失敗/)).toBeVisible()
    await expect(canvas.queryByText('TuneFailing')).toBeNull()
  },
}
