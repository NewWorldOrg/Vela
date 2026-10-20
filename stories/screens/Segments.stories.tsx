import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'

import {
  DETECTION_BOUNDARIES_SHORT,
  DETECTION_BY_HAND,
  DETECTION_BY_HAND_LEARNING_OFF,
  DETECTION_LEARNING_OFF,
  DETECTION_NOTHING_CHECKED,
  DETECTION_NOT_YET_EVALUATED,
  DETECTION_STATUS,
  DETECTION_WITH_OP_AND_ED,
  LEARNING_DATA,
  LEARNING_DATA_WAITING,
  NO_LEARNING_DATA,
  SEGMENT_STATUS_SIGNED_OUT,
  SEGMENT_STATUS_UNREAD,
} from '@/repository/segment-status.fixtures'
import type {
  SegmentVersionWrite,
  SkipThresholdWrite,
} from '@/repository/segments'
import { SegmentsView } from '@/components/segments/segments-page'
import { afterTheArrival } from '@/stories/after-the-arrival'
import { inTheSettings } from '@/stories/frames'
import { groundOf } from '@/stories/ground-of'

const chooseVersion = fn<(number: number) => Promise<SegmentVersionWrite>>(
  async () => ({ state: 'ok' }),
)

const leaveToLearning = fn<() => Promise<SegmentVersionWrite>>(async () => ({
  state: 'ok',
}))

const settleThreshold = fn<(threshold: number) => Promise<SkipThresholdWrite>>(
  async () => ({ state: 'ok' }),
)

const ACTIONS = {
  onChooseVersion: (number: number) => chooseVersion(number),
  onLeaveVersionToLearning: () => leaveToLearning(),
  onSettleSkipThreshold: (threshold: number) => settleThreshold(threshold),
}

const meta = {
  title: 'Screens/設定・CM・OP・ED の検出',
  component: SegmentsView,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/settings/segments' },
    },
    layout: 'fullscreen',
  },
  args: { status: DETECTION_STATUS, actions: ACTIONS },
  decorators: [inTheSettings],
} satisfies Meta<typeof SegmentsView>

export default meta
type Story = StoryObj<typeof meta>

const HEADINGS = [
  '精度',
  'モデルのバージョンの履歴',
  '飛ばすボタン',
  '学習に使うデータ',
]

const SWITCH = '切り替え'

const A_SWITCH = /切り替え/

const BACK_TO_AUTOMATIC = '自動に戻す'

function slotted(canvasElement: HTMLElement, slot: string): HTMLElement {
  const found = canvasElement.querySelector<HTMLElement>(
    `[data-slot="${slot}"]`,
  )

  if (!found) {
    throw new Error(`nothing is drawn as ${slot}`)
  }

  return found
}

function rowsOf(panel: HTMLElement): [string, string][] {
  const names = [...panel.querySelectorAll('dt')]
  const values = [...panel.querySelectorAll('dd')]

  return names.map((name, nth) => [
    name.textContent ?? '',
    values[nth]?.textContent ?? '',
  ])
}

async function rowsAre(
  canvasElement: HTMLElement,
  slot: string,
  rows: [string, string][],
): Promise<void> {
  await afterTheArrival(canvasElement)

  const panel = slotted(canvasElement, slot)

  await expect(getComputedStyle(panel).backgroundColor).toBe(
    groundOf(canvasElement, 'bg-surface'),
  )
  await expect(rowsOf(panel)).toEqual(rows)
}

function versions(canvasElement: HTMLElement): HTMLElement {
  return slotted(canvasElement, 'segment-versions')
}

function cellsOf(row: HTMLElement): string[] {
  return within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent ?? '')
}

function versionRows(canvasElement: HTMLElement): string[][] {
  return within(versions(canvasElement))
    .getAllByRole('row')
    .slice(1)
    .map(cellsOf)
}

function precision(canvasElement: HTMLElement): HTMLElement {
  return slotted(canvasElement, 'segment-precision')
}

function thresholdPanel(canvasElement: HTMLElement): HTMLElement {
  return slotted(canvasElement, 'skip-threshold')
}

const CHECKED = 'カタログで答え合わせした録画'

const FULL_PRECISION: [string, string][] = [
  ['モデルのバージョン', '第 3 版自動'],
  ['採用', '11/1(日) 03:05'],
  [CHECKED, '12 本'],
  ['境目の一致', '±2 秒 93%・±1 秒 85%'],
  ['CM の再現率', '95%'],
  ['飛ばした直後に戻った割合', '3%(直近 7 日)'],
]

const NOT_APPLICABLE_METRICS: [string, string][] = [
  ['境目の一致', '対象なし'],
  ['CM の再現率', '対象なし'],
  ['飛ばした直後に戻った割合', '対象なし'],
]

const THRESHOLD_ONLY: [string, string][] = [['閾値', '0.70']]

export const 評価のある検出: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await rowsAre(canvasElement, 'segment-precision', FULL_PRECISION)
    await expect(
      canvas
        .getAllByRole('heading', { level: 2 })
        .map((one) => one.textContent),
    ).toEqual(HEADINGS)
    await expect(
      within(precision(canvasElement).parentElement as HTMLElement)
        .getAllByRole('row')
        .slice(1)
        .map(cellsOf),
    ).toEqual([
      ['湾岸放送1', '5 本', '±2 秒 96%'],
      ['4第一テレビ1', '4 本', '±2 秒 91%'],
      ['6港町テレビ', '3 本', '対象なし'],
    ])
    await expect(
      within(precision(canvasElement).parentElement as HTMLElement)
        .getAllByRole('columnheader')
        .map((one) => one.textContent),
    ).toEqual(['局', CHECKED, '境目の一致'])
    await expect(versionRows(canvasElement)).toEqual([
      ['第 4 版', '11/8(日) 03:00', '候補', '±2 秒 94%', SWITCH],
      ['第 3 版', '11/1(日) 03:00', '使用中', '±2 秒 93%', ''],
      ['第 2 版', '10/25(日) 03:00', '使用終了', '±2 秒 95%', SWITCH],
      ['第 1 版', '10/18(日) 12:00', '使用終了', '対象なし', SWITCH],
    ])
    await expect(
      within(versions(canvasElement)).queryByRole('button', {
        name: BACK_TO_AUTOMATIC,
      }),
    ).toBeNull()
    await rowsAre(canvasElement, 'skip-threshold', THRESHOLD_ONLY)
    await rowsAre(canvasElement, 'learning-data', [
      ['データのある録画', '312 件'],
      ['時間', '187 時間'],
      ['大きさ', '0.4 GB'],
      ['繰り返し出る音', 'CM 820・番組の決まった部分 40'],
    ])
  },
}

export const 学習が切: Story = {
  args: { status: DETECTION_BY_HAND_LEARNING_OFF },
  play: async ({ canvasElement }) => {
    await rowsAre(canvasElement, 'segment-precision', [
      ['モデルのバージョン', '第 2 版手動で選択'],
      ['採用', '11/3(火) 10:12'],
      ['学習', '無効'],
      ...FULL_PRECISION.slice(2),
    ])

    const history = within(versions(canvasElement))

    await expect(history.queryAllByRole('button', { name: A_SWITCH })).toEqual(
      [],
    )
    await expect(
      history.queryByRole('button', { name: BACK_TO_AUTOMATIC }),
    ).toBeNull()
    await expect(history.queryByText('操作')).toBeNull()
    await expect(history.getAllByRole('columnheader')).toHaveLength(4)
    await expect(
      within(thresholdPanel(canvasElement)).getByRole('button', {
        name: '変更',
      }),
    ).toBeVisible()
  },
}

export const 学習が切で人が選んでいない版: Story = {
  args: { status: DETECTION_LEARNING_OFF },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)
    await expect(rowsOf(precision(canvasElement)).slice(0, 3)).toEqual([
      ['モデルのバージョン', '第 3 版自動'],
      ['採用', '11/1(日) 03:05'],
      ['学習', '無効'],
    ])
    await expect(
      within(versions(canvasElement)).queryAllByRole('button', {
        name: A_SWITCH,
      }),
    ).toEqual([])
  },
}

export const 人が選んだ版: Story = {
  args: { status: DETECTION_BY_HAND },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)

    const history = within(versions(canvasElement))
    const back = history.getByRole('button', { name: BACK_TO_AUTOMATIC })
    const heading = history.getByRole('heading', {
      name: 'モデルのバージョンの履歴',
    })

    await expect(rowsOf(precision(canvasElement))[0]).toEqual([
      'モデルのバージョン',
      '第 2 版手動で選択',
    ])
    await expect(back.getBoundingClientRect().left).toBeGreaterThan(
      heading.getBoundingClientRect().left,
    )
    await expect(back.getBoundingClientRect().top).toBeLessThan(
      heading.getBoundingClientRect().bottom,
    )
    await expect(back.getBoundingClientRect().bottom).toBeGreaterThan(
      heading.getBoundingClientRect().top,
    )
    await expect(
      versionRows(canvasElement).map((row) => [row[0], row[2], row[4]]),
    ).toEqual([
      ['第 4 版', '候補', SWITCH],
      ['第 3 版', '使用終了', SWITCH],
      ['第 2 版', '使用中', ''],
      ['第 1 版', '使用終了', SWITCH],
    ])
  },
}

export const 自動に戻す: Story = {
  args: { status: DETECTION_BY_HAND },
  play: async ({ canvasElement }) => {
    leaveToLearning.mockClear()

    await afterTheArrival(canvasElement)
    await userEvent.click(
      within(versions(canvasElement)).getByRole('button', {
        name: BACK_TO_AUTOMATIC,
      }),
    )

    await waitFor(() => expect(leaveToLearning).toHaveBeenCalledTimes(1))
    await expect(screen.queryByRole('alertdialog')).toBeNull()
    await expect(
      within(versions(canvasElement)).queryByRole('alert'),
    ).toBeNull()
  },
}

export const 自動に戻すのを断られる: Story = {
  args: {
    status: DETECTION_BY_HAND,
    actions: {
      ...ACTIONS,
      onLeaveVersionToLearning: async () => ({ state: 'learningOff' }) as const,
    },
  },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)

    const history = within(versions(canvasElement))

    await userEvent.click(
      history.getByRole('button', { name: BACK_TO_AUTOMATIC }),
    )

    await expect(
      await history.findByText('学習が無効のため、変更できませんでした。'),
    ).toBeVisible()
  },
}

export const 版を切り替える: Story = {
  play: async ({ canvasElement }) => {
    chooseVersion.mockClear()

    await afterTheArrival(canvasElement)
    await userEvent.click(
      within(versions(canvasElement)).getByRole('button', {
        name: '第 2 版に切り替え',
      }),
    )

    const dialog = await screen.findByRole('alertdialog')

    await expect(
      within(dialog).getByRole('heading', { name: '第 2 版に切り替えます' }),
    ).toBeVisible()
    await expect(dialog).toHaveTextContent(
      '録画の CM・OP・ED の位置を第 2 版で判定し直します。自動では切り替わらなくなります。',
    )
    await expect(chooseVersion).not.toHaveBeenCalled()

    await userEvent.click(
      within(dialog).getByRole('button', { name: '切り替える' }),
    )

    await waitFor(() => expect(chooseVersion).toHaveBeenCalledWith(2))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  },
}

export const 版を切り替えずに閉じる: Story = {
  play: async ({ canvasElement }) => {
    chooseVersion.mockClear()

    await afterTheArrival(canvasElement)
    await userEvent.click(
      within(versions(canvasElement)).getByRole('button', {
        name: '第 4 版に切り替え',
      }),
    )

    const dialog = await screen.findByRole('alertdialog')

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'キャンセル' }),
    )

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    await expect(chooseVersion).not.toHaveBeenCalled()
  },
}

export const 版の切り替えを断られる: Story = {
  args: {
    actions: {
      ...ACTIONS,
      onChooseVersion: async () => ({ state: 'learningOff' }) as const,
    },
  },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)
    await userEvent.click(
      within(versions(canvasElement)).getByRole('button', {
        name: '第 1 版に切り替え',
      }),
    )

    const dialog = await screen.findByRole('alertdialog')

    await userEvent.click(
      within(dialog).getByRole('button', { name: '切り替える' }),
    )

    await expect(
      await within(dialog).findByText(
        '学習が無効のため、切り替えできませんでした。',
      ),
    ).toBeVisible()
    await expect(screen.getByRole('alertdialog')).toBeVisible()
  },
}

export const 前の版に戻した記録: Story = {
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)

    const row = within(versions(canvasElement))
      .getAllByRole('row')
      .find((one) => one.textContent?.startsWith('第 2 版'))

    if (!row) {
      throw new Error('the second version is not in the history')
    }

    await userEvent.hover(within(row).getByText('使用終了'))

    const said = await screen.findByRole('tooltip')

    await expect(said).toHaveTextContent(
      '飛ばした直後に戻った割合が上がったため、前の版に戻しました。',
    )
    await expect(said).toHaveTextContent('10/28(水) 21:40')
  },
}

export const 評価がまだ無い: Story = {
  args: { status: DETECTION_NOT_YET_EVALUATED },
  play: async ({ canvasElement }) => {
    await rowsAre(canvasElement, 'segment-precision', [
      ['モデルのバージョン', '第 1 版自動'],
      ['採用', '10/18(日) 12:00'],
      ['学習', '答え合わせできる録画 4 / 10 本・CM の境目 37 / 100 か所'],
      [CHECKED, '4 本'],
      ...NOT_APPLICABLE_METRICS,
    ])
    await expect(
      within(precision(canvasElement).parentElement as HTMLElement).queryByRole(
        'table',
      ),
    ).toBeNull()
    await expect(versionRows(canvasElement)).toEqual([
      ['第 1 版', '10/18(日) 12:00', '使用中', '対象なし'],
    ])
    await rowsAre(canvasElement, 'skip-threshold', THRESHOLD_ONLY)
  },
}

export const 境目が足りない: Story = {
  args: { status: DETECTION_BOUNDARIES_SHORT },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)
    await expect(rowsOf(precision(canvasElement))[2]).toEqual([
      '学習',
      'CM の境目 84 / 100 か所',
    ])
  },
}

export const 答え合わせした録画が無い: Story = {
  args: { status: DETECTION_NOTHING_CHECKED },
  play: async ({ canvasElement }) => {
    await rowsAre(canvasElement, 'segment-precision', [
      ['モデルのバージョン', '第 1 版自動'],
      ['採用', '10/18(日) 12:00'],
      ['学習', '答え合わせできる録画 0 / 10 本・CM の境目 0 / 100 か所'],
      [CHECKED, '0 本'],
      ...NOT_APPLICABLE_METRICS,
    ])
  },
}

export const OPとEDの再現率: Story = {
  args: { status: DETECTION_WITH_OP_AND_ED },
  play: async ({ canvasElement }) => {
    await rowsAre(canvasElement, 'segment-precision', [
      ...FULL_PRECISION.slice(0, 5),
      ['OP の再現率', '90%'],
      ['ED の再現率', '対象なし'],
      FULL_PRECISION[5],
    ])
  },
}

async function editTheThreshold(canvasElement: HTMLElement) {
  await afterTheArrival(canvasElement)

  const panel = within(thresholdPanel(canvasElement))

  await userEvent.click(panel.getByRole('button', { name: '変更' }))

  const field = panel.getByRole('textbox', { name: '閾値' })

  await expect(field).toHaveFocus()
  await expect(field).toHaveValue('0.70')
  await expect(
    panel.getAllByRole('button').map((one) => one.textContent),
  ).toEqual(['キャンセル', '保存する'])

  return { panel, field }
}

export const 閾値を変える: Story = {
  play: async ({ canvasElement }) => {
    settleThreshold.mockClear()

    const { panel, field } = await editTheThreshold(canvasElement)

    await userEvent.clear(field)
    await userEvent.type(field, '0.62')
    await userEvent.click(panel.getByRole('button', { name: '保存する' }))

    await waitFor(() => expect(settleThreshold).toHaveBeenCalledWith(0.62))
    await waitFor(() =>
      expect(panel.getByRole('button', { name: '変更' })).toHaveFocus(),
    )
    await expect(panel.queryByRole('textbox')).toBeNull()
  },
}

export const 閾値の範囲の外: Story = {
  play: async ({ canvasElement }) => {
    settleThreshold.mockClear()

    const { panel, field } = await editTheThreshold(canvasElement)

    await userEvent.clear(field)
    await userEvent.type(field, '0.97')
    await userEvent.click(panel.getByRole('button', { name: '保存する' }))

    await expect(panel.getByText('閾値は 0.50 〜 0.95 です。')).toBeVisible()
    await expect(field).toHaveAttribute('aria-invalid', 'true')

    await userEvent.clear(field)
    await userEvent.type(field, 'あ')

    await expect(panel.getByText('数値を入力してください。')).toBeVisible()
    await expect(settleThreshold).not.toHaveBeenCalled()

    await userEvent.click(panel.getByRole('button', { name: 'キャンセル' }))

    await expect(panel.queryByRole('textbox')).toBeNull()
    await expect(panel.queryByText('数値を入力してください。')).toBeNull()
  },
}

export const 閾値を断られる: Story = {
  args: {
    actions: {
      ...ACTIONS,
      onSettleSkipThreshold: async () => ({ state: 'outOfRange' }) as const,
    },
  },
  play: async ({ canvasElement }) => {
    const { panel, field } = await editTheThreshold(canvasElement)

    await userEvent.clear(field)
    await userEvent.type(field, '0.55')
    await userEvent.click(panel.getByRole('button', { name: '保存する' }))

    await expect(
      await panel.findByText('閾値は 0.50 〜 0.95 です。'),
    ).toBeVisible()
    await expect(field).toHaveValue('0.55')
  },
}

export const 閾値を保存できない: Story = {
  args: {
    actions: {
      ...ACTIONS,
      onSettleSkipThreshold: async () => ({ state: 'notSaved' }) as const,
    },
  },
  play: async ({ canvasElement }) => {
    const { panel } = await editTheThreshold(canvasElement)

    await userEvent.click(panel.getByRole('button', { name: '保存する' }))

    await expect(
      await panel.findByText(
        '保存できませんでした。時間をおいてからもう一度お試しください。',
      ),
    ).toBeVisible()
  },
}

export const データなし: Story = {
  args: { status: NO_LEARNING_DATA },
  play: async ({ canvasElement }) => {
    await rowsAre(canvasElement, 'learning-data', [
      ['データのある録画', '0 件'],
      ['時間', '0 時間'],
      ['大きさ', '0 B'],
      ['繰り返し出る音', 'CM 0・番組の決まった部分 0'],
    ])
  },
}

export const データあり: Story = {
  args: { status: LEARNING_DATA },
  play: async ({ canvasElement }) => {
    await rowsAre(canvasElement, 'learning-data', [
      ['データのある録画', '312 件'],
      ['時間', '187 時間'],
      ['大きさ', '0.4 GB'],
      ['繰り返し出る音', 'CM 820・番組の決まった部分 40'],
    ])
  },
}

export const 取り出し待ちあり: Story = {
  args: { status: LEARNING_DATA_WAITING },
  play: async ({ canvasElement }) => {
    await rowsAre(canvasElement, 'learning-data', [
      ['データのある録画', '312 件'],
      ['時間', '187 時間'],
      ['大きさ', '0.4 GB'],
      ['取り出し待ち', '12 件'],
      ['繰り返し出る音', 'CM 820・番組の決まった部分 40'],
    ])
  },
}

const SURFACES = [
  'segment-precision',
  'segment-version-table',
  'skip-threshold',
  'learning-data',
]

async function everySurfaceSays(
  canvasElement: HTMLElement,
  word: string,
): Promise<void> {
  await afterTheArrival(canvasElement)

  const canvas = within(canvasElement)

  await expect(
    canvas.getAllByRole('heading', { level: 2 }).map((one) => one.textContent),
  ).toEqual(HEADINGS)

  for (const slot of SURFACES) {
    const panel = slotted(canvasElement, slot)

    await expect(getComputedStyle(panel).backgroundColor).toBe(
      groundOf(canvasElement, 'bg-surface-2'),
    )
    await expect(panel).toHaveTextContent(word)
    await expect(panel.querySelector('dl')).toBeNull()
  }

  for (const action of ['変更', BACK_TO_AUTOMATIC, A_SWITCH]) {
    await expect(canvas.queryAllByRole('button', { name: action })).toEqual([])
  }
}

export const 読めない: Story = {
  args: { status: SEGMENT_STATUS_UNREAD },
  play: async ({ canvasElement }) => {
    await everySurfaceSays(canvasElement, '状態不明')
  },
}

export const サインインが切れている: Story = {
  args: { status: SEGMENT_STATUS_SIGNED_OUT },
  play: async ({ canvasElement }) => {
    await everySurfaceSays(canvasElement, '未サインイン')
  },
}

export const 狭い幅: Story = {
  args: { status: DETECTION_BY_HAND },
  parameters: { screen: { width: 390, height: 844 } },
  play: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)

    const page = canvasElement.ownerDocument.documentElement

    await expect(page.scrollWidth).toBeLessThanOrEqual(page.clientWidth)
    await expect(
      within(versions(canvasElement)).getByRole('button', {
        name: BACK_TO_AUTOMATIC,
      }),
    ).toBeVisible()
  },
}

async function theNavNameFits(canvasElement: HTMLElement): Promise<void> {
  await afterTheArrival(canvasElement)
  await canvasElement.ownerDocument.fonts.ready

  const canvas = within(canvasElement)
  const item = canvas.getByRole('link', { name: 'CM・OP・ED の検出' })
  const beside = canvas.getByRole('link', { name: 'エンコード' })
  const name = item.querySelector('span')

  if (!name) {
    throw new Error('the nav item has no name drawn')
  }

  const box = item.getBoundingClientRect()
  const text = name.getBoundingClientRect()
  const gap = parseFloat(getComputedStyle(item).paddingRight)

  await expect(
    canvas.getByRole('heading', { level: 1, name: 'CM・OP・ED の検出' }),
  ).toBeVisible()
  await expect(item).toHaveAttribute('aria-current', 'page')
  await expect(text.right).toBeLessThanOrEqual(box.right - gap)
  await expect(name.scrollWidth).toBeLessThanOrEqual(Math.ceil(text.width))
  await expect(box.height).toBe(beside.getBoundingClientRect().height)
}

export const ナビの名前が収まる: Story = {
  parameters: { screen: { width: 1440, height: 900 } },
  play: async ({ canvasElement }) => {
    await theNavNameFits(canvasElement)
  },
}

export const ナビの名前が名前の出る最も狭い幅でも収まる: Story = {
  parameters: { screen: { width: 901, height: 900 } },
  play: async ({ canvasElement }) => {
    await theNavNameFits(canvasElement)
  },
}
