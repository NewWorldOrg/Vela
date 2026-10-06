import type { Meta, StoryObj } from '@storybook/nextjs'
import {
  expect,
  fireEvent,
  screen,
  userEvent,
  waitFor,
  within,
} from 'storybook/test'

import { newRuleHref, ruleTermsOfSearch, seriesTermsOf } from '@/lib/rules'
import { searchConditionOfQuery, searchTermsOf } from '@/lib/search-condition'
import type {
  Rule,
  RuleApplication,
  RuleDraft,
  RuleImpact,
  RulePreview,
  RuleRetirement,
  RuleWrite,
} from '@/repository/rules'
import { RULE_CHANNEL_FIXTURES, RULE_FIXTURES } from '@/stories/fixtures/rules'
import type { RuleActions } from '@/components/reservations/rules-page'
import { afterTheArrival } from '@/stories/after-the-arrival'
import { RulesView } from '@/components/reservations/rules-page'
import { inTheApp } from '@/stories/frames'

interface Saved {
  id: string | undefined
  draft: RuleDraft
}

const retired: string[] = []

const weighed: { id: string | undefined; draft: RuleDraft }[] = []

const PREVIEW: RulePreview = {
  takes: [
    {
      id: '131-1310-9001',
      whenLabel: '08/09(土) 22:00 – 22:30',
      channelName: '中央テレビ1',
      channelNo: '011',
      title: '星のさまよいびと 第1話',
      alreadyReserved: false,
      verdict: 'secured',
    },
    {
      id: '132-1320-9002',
      whenLabel: '08/10(日) 24:30 – 25:00',
      channelName: '湾岸放送1',
      channelNo: '041',
      title: '未明のレイライン 第1話',
      alreadyReserved: false,
      verdict: 'contended',
    },
    {
      id: '4-101-9003',
      whenLabel: '08/12(火) 25:05 – 25:35',
      channelName: '衛星第一',
      channelNo: '101',
      title: 'クロックワークガーデン 第1話',
      alreadyReserved: true,
    },
  ],
  matched: 3,
  making: 2,
  alreadyReserved: 1,
  contended: 1,
  excluded: { shadows: 2, moved: 1 },
}

const IMPACT: RuleImpact = {
  making: 2,
  withdrawing: 1,
  sweeping: 5,
  changingHands: 3,
  excluded: { shadows: 2, moved: 1 },
}

const RETIRED: RuleRetirement = { withdrawn: 4, swept: 0 }

const APPLIED: RuleApplication = {
  read: 1840,
  made: 3,
  refused: 0,
  withdrawn: 1,
  turnedOff: 0,
  faulted: 0,
  excludedAsMoved: 1,
}

const applied: string[] = []

const MARKED_REQUIRED = [
  '条件',
  'ルール名',
  '優先度',
  '前マージン(秒)',
  '後マージン(秒)',
]

function whatIsMarkedRequired(canvasElement: HTMLElement): string[] {
  return [...canvasElement.querySelectorAll('[data-slot="required-mark"]')].map(
    (mark) =>
      (mark.parentElement?.textContent ?? '')
        .replace(mark.textContent ?? '', '')
        .trim(),
  )
}

function recording(saved: Saved[], turned: [string, boolean][]): RuleActions {
  return {
    onSave: async (id, draft): Promise<RuleWrite<Rule>> => {
      saved.push({ id, draft })

      return { state: 'ok', data: RULE_FIXTURES[0] }
    },
    onDelete: async (id): Promise<RuleWrite<RuleRetirement>> => {
      retired.push(id)

      return { state: 'ok', data: RETIRED }
    },
    onSwitch: async (id, enabled): Promise<RuleWrite<number>> => {
      turned.push([id, enabled])

      return { state: 'ok', data: 0 }
    },
    onPreview: async (): Promise<RuleWrite<RulePreview>> => ({
      state: 'ok',
      data: PREVIEW,
    }),
    onImpact: async (draft, id): Promise<RuleWrite<RuleImpact>> => {
      weighed.push({ id, draft })

      return { state: 'ok', data: IMPACT }
    },
    onApply: async (id): Promise<RuleWrite<RuleApplication>> => {
      applied.push(id)

      return { state: 'ok', data: APPLIED }
    },
  }
}

function applyingWith(
  answer: RuleWrite<RuleApplication>,
): Pick<RuleActions, 'onApply'> {
  return {
    onApply: async (id) => {
      applied.push(id)

      return answer
    },
  }
}

async function applyNow(canvasElement: HTMLElement): Promise<HTMLElement> {
  const canvas = within(canvasElement)

  applied.length = 0

  await userEvent.click(
    canvas.getByRole('button', { name: 'ルールを即時適用' }),
  )

  return waitFor(() => {
    const notice = canvasElement.querySelector<HTMLElement>(
      '[data-slot="rule-application"]',
    )

    if (!notice) {
      throw new Error('the notice has not come yet')
    }

    return notice
  })
}

async function choose(list: string, option: string): Promise<void> {
  await userEvent.click(screen.getByRole('combobox', { name: list }))
  await userEvent.click(await screen.findByRole('option', { name: option }))

  await afterTheArrival(document.body)
}

function picked(canvasElement: HTMLElement, kind: string): string[] {
  return within(canvasElement)
    .queryAllByRole('button', { name: new RegExp(`^${kind} .+ を外す$`) })
    .map((one) => one.getAttribute('aria-label') ?? '')
}

const meta = {
  title: 'Screens/ルール',
  component: RulesView,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/reservations/rules' },
    },
    layout: 'fullscreen',
  },
  args: {
    result: { items: RULE_FIXTURES, total: RULE_FIXTURES.length },
    channels: RULE_CHANNEL_FIXTURES,
  },
  decorators: [inTheApp],
} satisfies Meta<typeof RulesView>

export default meta
type Story = StoryObj<typeof meta>

const listSaved: Saved[] = []
const listTurned: [string, boolean][] = []

export const 通常: Story = {
  args: {
    editing: { state: 'none' },
    actions: recording(listSaved, listTurned),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    listTurned.length = 0

    await expect(
      canvas.getByRole('link', { name: '検索から作成' }),
    ).toHaveAttribute('href', '/search')

    await expect(
      canvas.getByRole('switch', { name: '深夜アニメを追う を有効にする' }),
    ).toBeChecked()
    await expect(
      canvas.getByRole('switch', { name: 'ドラマの最終回だけ を有効にする' }),
    ).not.toBeChecked()

    await expect(
      canvas.getByRole('button', { name: /^週末の国内アニメ/ }),
    ).toHaveTextContent(
      /ジャンル: ドラマ・国内アニメ\(アニメ\/特撮\)・アニメ\(映画\) · 曜日: 土・日 · 期間: .*08\/08\(土\) 〜 .*08\/31\(月\) · すべてのチャンネル/,
    )
    await expect(
      canvas.getByRole('button', { name: /^新番組のアニメ/ }),
    ).toHaveTextContent(
      /ジャンル: 国内アニメ\(アニメ\/特撮\) · 地上波 · 印: 新番組 · 除外する印: 再放送 · すべてのチャンネル/,
    )

    await userEvent.click(
      canvas.getByRole('switch', { name: 'ドラマの最終回だけ を有効にする' }),
    )

    await waitFor(() => expect(listTurned).toEqual([['rule-303', true]]))

    await afterTheArrival(canvasElement)

    const list = canvas
      .getByRole('switch', { name: '深夜アニメを追う を有効にする' })
      .closest('section') as HTMLElement
    const chosen = canvas
      .getByText('選択中のルールがありません')
      .closest('[data-slot="empty-state"]') as HTMLElement

    if (window.innerWidth > 1060) {
      await expect(chosen.getBoundingClientRect().top).toBeCloseTo(
        list.getBoundingClientRect().top,
        0,
      )
    }
  },
}

const editSaved: Saved[] = []

export const ルールを編集: Story = {
  args: {
    editing: { state: 'rule', rule: RULE_FIXTURES[0] },
    actions: recording(editSaved, []),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    editSaved.length = 0

    await expect(canvas.getByLabelText(/ルール名/)).toHaveValue(
      '深夜アニメを追う',
    )
    await expect(canvas.getByLabelText('キーワード')).toHaveValue('新番組')
    await expect(canvas.getByLabelText('除外キーワード')).toHaveValue('再放送')
    await expect(canvas.getByLabelText(/優先度/)).toHaveValue('20')
    await expect(
      canvas.getByRole('switch', { name: 'エンコード' }),
    ).toBeChecked()

    await expect(
      canvas.getByRole('link', { name: '番組検索へ' }),
    ).toHaveAttribute(
      'href',
      '/search?q=%E6%96%B0%E7%95%AA%E7%B5%84&exclude=%E5%86%8D%E6%94%BE%E9%80%81&genre=anime',
    )

    await userEvent.click(canvas.getByRole('button', { name: '一致を表示' }))

    await expect(
      await canvas.findByText('星のさまよいびと 第1話'),
    ).toBeVisible()
    await expect(canvas.getByText('未明のレイライン 第1話')).toBeVisible()
    await expect(canvas.getByText('クロックワークガーデン 第1話')).toBeVisible()
    await expect(canvas.getByText(/件は除外されました/)).toHaveTextContent(
      '3 件は除外されました(同時放送 2 件、移動 1 件)。',
    )

    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    const dialog = within(await screen.findByRole('dialog'))

    await afterTheArrival(canvasElement)

    await expect(
      await dialog.findByText(/新しく作られる予約/),
    ).toHaveTextContent('新しく作られる予約 2 件')
    await expect(dialog.getByText(/引っ込む予約/)).toHaveTextContent(
      '引っ込む予約 1 件',
    )
    await expect(
      dialog.getByText(/このルールに付け替わる予約/),
    ).toHaveTextContent('このルールに付け替わる予約 3 件')
    await expect(dialog.getByText(/件は除外されました/)).toHaveTextContent(
      '3 件は除外されました(同時放送 2 件、移動 1 件)。',
    )

    await userEvent.click(dialog.getByRole('button', { name: '保存する' }))

    await waitFor(() =>
      expect(editSaved).toEqual([
        {
          id: 'rule-301',
          draft: {
            name: '深夜アニメを追う',
            terms: {
              q: '新番組',
              exclude: '再放送',
              fields: 'title,description',
              genres: ['anime'],
              subgenres: [],
              kind: undefined,
              channels: [],
              days: [],
              marks: [],
              excludedMarks: [],
              from: undefined,
              to: undefined,
              beyond: [],
            },
            priority: 20,
            enabled: true,
            marginBeforeSeconds: 10,
            marginAfterSeconds: 30,
            encodeWhenRecorded: true,
          },
        },
      ]),
    )

    retired.length = 0
    await afterTheArrival(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: '削除' }))
    await expect(await screen.findByRole('alertdialog')).toHaveTextContent(
      'このルールを削除します',
    )

    await expect(
      await within(screen.getByRole('alertdialog')).findByText(/引っ込む予約/),
    ).toHaveTextContent('引っ込む予約 5 件')
    await expect(retired).toEqual([])

    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'キャンセル',
      }),
    )
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    await expect(retired).toEqual([])

    await userEvent.click(canvas.getByRole('button', { name: '削除' }))
    await userEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: '削除する',
      }),
    )
    await waitFor(() => expect(retired).toEqual(['rule-301']))
  },
}

const untouchedSaved: Saved[] = []

export const 開いて保存し直しても条件は変わらない: Story = {
  args: {
    editing: { state: 'rule', rule: RULE_FIXTURES[3] },
    actions: recording(untouchedSaved, []),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    untouchedSaved.length = 0

    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    const dialog = within(await screen.findByRole('dialog'))

    await afterTheArrival(canvasElement)
    await userEvent.click(
      await dialog.findByRole('button', { name: '保存する' }),
    )

    await waitFor(() => expect(untouchedSaved).toHaveLength(1))
    await expect(untouchedSaved[0].draft.terms).toEqual(RULE_FIXTURES[3].terms)
  },
}

const widenedSaved: Saved[] = []

export const 曜日とサブジャンルと期間を足す: Story = {
  args: {
    editing: { state: 'rule', rule: RULE_FIXTURES[0] },
    actions: recording(widenedSaved, []),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    widenedSaved.length = 0

    await choose('曜日を追加', '水曜')
    await choose('曜日を追加', '月曜')
    await expect(picked(canvasElement, '曜日')).toEqual([
      '曜日 月曜 を外す',
      '曜日 水曜 を外す',
    ])

    await userEvent.click(
      canvas.getByRole('combobox', { name: 'サブジャンルを追加' }),
    )
    await expect(
      await screen.findByRole('group', { name: 'ドラマ' }),
    ).toBeVisible()
    await expect(
      screen.queryByRole('group', { name: 'アニメ/特撮' }),
    ).toBeNull()
    await userEvent.click(screen.getByRole('option', { name: '海外ドラマ' }))
    await afterTheArrival(document.body)
    await expect(picked(canvasElement, 'サブジャンル')).toEqual([
      'サブジャンル 海外ドラマ(ドラマ) を外す',
    ])

    fireEvent.change(canvas.getByLabelText('期間の開始日'), {
      target: { value: '2026-08-08' },
    })
    fireEvent.change(canvas.getByLabelText('期間の終了日'), {
      target: { value: '2026-08-31' },
    })

    await expect(
      canvas.getByRole('link', { name: '番組検索へ' }),
    ).toHaveAttribute(
      'href',
      '/search?q=%E6%96%B0%E7%95%AA%E7%B5%84&exclude=%E5%86%8D%E6%94%BE%E9%80%81&genre=anime&from=2026-08-08&to=2026-08-31',
    )

    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    const dialog = within(await screen.findByRole('dialog'))

    await afterTheArrival(canvasElement)
    await userEvent.click(
      await dialog.findByRole('button', { name: '保存する' }),
    )

    await waitFor(() => expect(widenedSaved).toHaveLength(1))
    await expect(widenedSaved[0].draft.terms).toEqual({
      ...RULE_FIXTURES[0].terms,
      kind: undefined,
      subgenres: ['3-1'],
      days: ['monday', 'wednesday'],
      marks: [],
      excludedMarks: [],
      from: '2026-08-08',
      to: '2026-08-31',
    })
  },
}

const markedSaved: Saved[] = []

export const 印と除外する印を足す: Story = {
  args: {
    editing: { state: 'rule', rule: RULE_FIXTURES[1] },
    actions: recording(markedSaved, []),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    markedSaved.length = 0

    await choose('印を追加', '初放送')
    await choose('印を追加', '新番組')
    await expect(picked(canvasElement, '印')).toEqual([
      '印 新番組 を外す',
      '印 初放送 を外す',
    ])

    await userEvent.click(
      canvas.getByRole('combobox', { name: '除外する印を追加' }),
    )
    await expect(screen.queryByRole('option', { name: '新番組' })).toBeNull()
    await userEvent.click(await screen.findByRole('option', { name: '再放送' }))
    await afterTheArrival(document.body)
    await expect(picked(canvasElement, '除外する印')).toEqual([
      '除外する印 再放送 を外す',
    ])

    await userEvent.click(
      canvas.getByRole('button', { name: '印 初放送 を外す' }),
    )
    await expect(picked(canvasElement, '印')).toEqual(['印 新番組 を外す'])

    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    const dialog = within(await screen.findByRole('dialog'))

    await afterTheArrival(canvasElement)
    await userEvent.click(
      await dialog.findByRole('button', { name: '保存する' }),
    )

    await waitFor(() => expect(markedSaved).toHaveLength(1))
    await expect(markedSaved[0].draft.terms).toEqual({
      ...RULE_FIXTURES[1].terms,
      kind: undefined,
      marks: ['New'],
      excludedMarks: ['Rerun'],
      from: undefined,
      to: undefined,
    })
  },
}

export const 印だけのルールは保存できる: Story = {
  args: {
    editing: {
      state: 'new',
      terms: {
        q: undefined,
        exclude: undefined,
        fields: 'title,description',
        genres: [],
        subgenres: [],
        channels: [],
        days: [],
        marks: [],
        excludedMarks: [],
        beyond: [],
      },
    },
    actions: recording([], []),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    weighed.length = 0

    await userEvent.type(canvas.getByLabelText(/ルール名/), '新番組')
    await choose('印を追加', '新番組')
    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(weighed).toHaveLength(1))
    await expect(weighed[0].draft.terms.marks).toEqual(['New'])
  },
}

const periodSaved: Saved[] = []

export const 期間は31日までで開始日から終了日へ向かう: Story = {
  args: {
    editing: { state: 'rule', rule: RULE_FIXTURES[0] },
    actions: recording(periodSaved, []),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const from = canvas.getByLabelText('期間の開始日')
    const to = canvas.getByLabelText('期間の終了日')
    const refusal =
      '期間は開始日から終了日へ向かう最長 31 日の範囲で指定できます。'

    periodSaved.length = 0
    weighed.length = 0

    fireEvent.change(from, { target: { value: '2026-08-01' } })
    fireEvent.change(to, { target: { value: '2026-09-01' } })
    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    await expect(await canvas.findByText(refusal)).toBeVisible()
    await expect(from).toHaveAttribute('aria-invalid', 'true')
    await expect(to).toHaveAttribute('aria-invalid', 'true')
    await expect(screen.queryByRole('dialog')).toBeNull()
    await expect(weighed).toEqual([])

    fireEvent.change(to, { target: { value: '2026-07-31' } })
    await userEvent.click(canvas.getByRole('button', { name: '保存' }))
    await expect(canvas.getByText(refusal)).toBeVisible()
    await expect(weighed).toEqual([])

    fireEvent.change(to, { target: { value: '2026-08-31' } })
    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(weighed).toHaveLength(1))
    await expect(canvas.queryByText(refusal)).toBeNull()
  },
}

export const 曜日だけのルールは保存できる: Story = {
  args: {
    editing: {
      state: 'new',
      terms: {
        q: undefined,
        exclude: undefined,
        fields: 'title,description',
        genres: [],
        subgenres: [],
        channels: [],
        days: [],
        marks: [],
        excludedMarks: [],
        beyond: [],
      },
    },
    actions: recording([], []),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const refusal =
      'キーワード・除外キーワード・ジャンル・サブジャンル・種別・チャンネル・曜日・期間・印・除外する印のうち、1 つ以上を指定してください。'

    weighed.length = 0

    await userEvent.type(canvas.getByLabelText(/ルール名/), '週末だけ')
    await userEvent.click(canvas.getByRole('button', { name: '保存' }))
    await expect(await canvas.findByText(refusal)).toBeVisible()

    await choose('曜日を追加', '土曜')
    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(weighed).toHaveLength(1))
    await expect(weighed[0].draft.terms.days).toEqual(['saturday'])
    await expect(canvas.queryByText(refusal)).toBeNull()
  },
}

const draftSaved: Saved[] = []

export const 検索から作る: Story = {
  args: {
    editing: {
      state: 'new',
      terms: {
        q: '特別警報',
        exclude: undefined,
        fields: 'title,description',
        genres: [],
        subgenres: [],
        channels: ['132-1320'],
        days: [],
        marks: [],
        excludedMarks: [],
        beyond: [],
      },
    },
    actions: recording(draftSaved, []),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    draftSaved.length = 0

    await expect(whatIsMarkedRequired(canvasElement)).toEqual(MARKED_REQUIRED)

    await expect(canvas.getByLabelText('キーワード')).toHaveValue('特別警報')
    await expect(canvas.getByText('湾岸放送1')).toBeVisible()

    await userEvent.click(canvas.getByRole('button', { name: '保存' }))
    await expect(
      await canvas.findByText('ルール名は 1 〜 128 文字です。'),
    ).toBeVisible()
    await expect(screen.queryByRole('dialog')).toBeNull()
    await expect(draftSaved).toEqual([])

    await userEvent.type(canvas.getByLabelText(/ルール名/), '気象・災害特番')
    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    const dialog = within(await screen.findByRole('dialog'))

    await afterTheArrival(canvasElement)
    await userEvent.click(
      await dialog.findByRole('button', { name: '保存する' }),
    )

    await waitFor(() =>
      expect(draftSaved).toEqual([
        {
          id: undefined,
          draft: {
            name: '気象・災害特番',
            terms: {
              q: '特別警報',
              exclude: undefined,
              fields: 'title,description',
              genres: [],
              subgenres: [],
              kind: undefined,
              channels: ['132-1320'],
              days: [],
              marks: [],
              excludedMarks: [],
              from: undefined,
              to: undefined,
              beyond: [],
            },
            priority: 10,
            enabled: true,
            marginBeforeSeconds: 0,
            marginAfterSeconds: 0,
            encodeWhenRecorded: true,
          },
        },
      ]),
    )
  },
}

const seriesSaved: Saved[] = []

const HANDED_OVER = ruleTermsOfSearch(
  searchTermsOf(
    searchConditionOfQuery(
      newRuleHref(seriesTermsOf('星のさまよいびと 第1話', '4-101')!).split(
        '?',
      )[1],
    ),
  ),
)

export const 番組詳細から作る: Story = {
  args: {
    editing: { state: 'new', terms: HANDED_OVER },
    actions: recording(seriesSaved, []),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    seriesSaved.length = 0

    await expect(canvas.getByLabelText('キーワード')).toHaveValue(
      '星のさまよいびと',
    )
    await expect(canvas.getByLabelText('対象範囲')).toHaveTextContent(
      '番組名だけ',
    )
    await expect(canvas.getByText('衛星第一')).toBeVisible()

    await userEvent.type(canvas.getByLabelText(/ルール名/), '星のさまよいびと')
    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    const dialog = within(await screen.findByRole('dialog'))

    await afterTheArrival(canvasElement)
    await userEvent.click(
      await dialog.findByRole('button', { name: '保存する' }),
    )

    await waitFor(() => expect(seriesSaved).toHaveLength(1))
    await expect(seriesSaved[0].draft.terms).toEqual(HANDED_OVER)
  },
}

const emptySaved: Saved[] = []

export const 条件のないルール: Story = {
  args: {
    editing: {
      state: 'new',
      terms: {
        q: undefined,
        exclude: undefined,
        fields: 'title',
        genres: [],
        subgenres: [],
        channels: [],
        days: [],
        marks: [],
        excludedMarks: [],
        beyond: [],
      },
    },
    actions: recording(emptySaved, []),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    emptySaved.length = 0

    await userEvent.type(canvas.getByLabelText(/ルール名/), 'なんでも録る')
    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    await expect(
      await canvas.findByText(
        'キーワード・除外キーワード・ジャンル・サブジャンル・種別・チャンネル・曜日・期間・印・除外する印のうち、1 つ以上を指定してください。',
      ),
    ).toBeVisible()
    await expect(screen.queryByRole('dialog')).toBeNull()
    await expect(emptySaved).toEqual([])

    await userEvent.type(canvas.getByLabelText('キーワード'), '台風')
    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    const dialog = within(await screen.findByRole('dialog'))

    await afterTheArrival(canvasElement)
    await userEvent.click(
      await dialog.findByRole('button', { name: '保存する' }),
    )

    await waitFor(() => expect(emptySaved).toHaveLength(1))
    await expect(emptySaved[0].draft.terms.q).toBe('台風')
  },
}

const heldPreview: { release: () => void } = { release: () => undefined }

export const 一致を見ているあいだに条件を変えると結果は古いまま: Story = {
  args: {
    editing: { state: 'rule', rule: RULE_FIXTURES[0] },
    actions: {
      ...recording([], []),
      onPreview: async (): Promise<RuleWrite<RulePreview>> => {
        await new Promise<void>((resolve) => {
          heldPreview.release = resolve
        })

        return { state: 'ok', data: PREVIEW }
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '一致を表示' }))
    await userEvent.type(canvas.getByLabelText('キーワード'), '2')

    heldPreview.release()

    const counted = await canvas.findByText(
      (_, element) =>
        element?.tagName === 'SPAN' &&
        /^一致 \d+ 件 \/ 新しく作られる/.test(element.textContent ?? ''),
    )

    await expect(counted).toHaveClass('text-ink-3')
  },
}

const refusedSaved: Saved[] = []

export const 影響を数えられないとき: Story = {
  args: {
    editing: { state: 'rule', rule: RULE_FIXTURES[1] },
    actions: {
      ...recording(refusedSaved, []),
      onImpact: async (): Promise<RuleWrite<RuleImpact>> => ({
        state: 'rejected',
        message:
          'チューナーの空きを数えられないため、影響を数えられませんでした。時間をおいてからもう一度お試しください。',
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    refusedSaved.length = 0
    retired.length = 0

    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    await expect(
      await canvas.findByText(
        'チューナーの空きを数えられないため、影響を数えられませんでした。時間をおいてからもう一度お試しください。',
      ),
    ).toBeVisible()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await expect(refusedSaved).toEqual([])

    await userEvent.click(canvas.getByRole('button', { name: '削除' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    await expect(retired).toEqual([])
  },
}

const standingSaved: Saved[] = []

export const 削除の件数は保存済みのルールから数える: Story = {
  args: {
    editing: { state: 'rule', rule: RULE_FIXTURES[0] },
    actions: recording(standingSaved, []),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    standingSaved.length = 0
    retired.length = 0
    weighed.length = 0

    await userEvent.clear(canvas.getByLabelText(/ルール名/))
    await userEvent.type(canvas.getByLabelText(/ルール名/), '書きかけの名前')
    await userEvent.type(canvas.getByLabelText('キーワード'), 'まだ保存前')

    await userEvent.click(canvas.getByRole('button', { name: '削除' }))

    await expect(
      await within(await screen.findByRole('alertdialog')).findByText(
        /引っ込む予約/,
      ),
    ).toHaveTextContent('引っ込む予約 5 件')

    await waitFor(() => expect(weighed).toHaveLength(1))
    await expect(weighed[0].id).toBe('rule-301')
    await expect(weighed[0].draft.name).toBe('深夜アニメを追う')
    await expect(weighed[0].draft.terms.q).toBe('新番組')

    await expect(screen.getByRole('alertdialog')).toHaveTextContent(
      '深夜アニメを追う',
    )
    await expect(canvas.getByLabelText(/ルール名/)).toHaveValue(
      '書きかけの名前',
    )

    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: '削除する',
      }),
    )
    await waitFor(() => expect(retired).toEqual(['rule-301']))
    await expect(standingSaved).toEqual([])
  },
}

const encodeSaved: Saved[] = []

export const エンコードしないルール: Story = {
  args: {
    editing: { state: 'rule', rule: RULE_FIXTURES[1] },
    actions: recording(encodeSaved, []),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    encodeSaved.length = 0

    const encode = canvas.getByRole('switch', { name: 'エンコード' })

    await expect(encode).not.toBeChecked()

    await userEvent.click(encode)
    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    const dialog = within(await screen.findByRole('dialog'))

    await afterTheArrival(canvasElement)

    await userEvent.click(
      await dialog.findByRole('button', { name: '保存する' }),
    )

    await waitFor(() => expect(encodeSaved).toHaveLength(1))
    await expect(encodeSaved[0].draft.encodeWhenRecorded).toBe(true)
  },
}

const addSaved: Saved[] = []

export const ジャンルを足すは下に開く: Story = {
  args: {
    editing: { state: 'rule', rule: RULE_FIXTURES[0] },
    actions: recording(addSaved, []),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const add = canvas.getByRole('combobox', { name: 'ジャンルを追加' })

    await userEvent.click(add)

    const opened = await waitFor(() => {
      const content = document.querySelector('[data-slot="select-content"]')

      if (!(content instanceof HTMLElement)) {
        throw new Error('the select did not open')
      }

      return content
    })

    await expect(opened).toHaveAttribute('data-side', 'bottom')
    await expect(
      Math.round(opened.getBoundingClientRect().top),
    ).toBeGreaterThanOrEqual(Math.round(add.getBoundingClientRect().top))

    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(document.querySelector('[data-slot="select-content"]')).toBeNull(),
    )
  },
}

const LONG_NAMED_RULE: Rule = {
  ...RULE_FIXTURES[0],
  id: 'rule-390',
  name: '深夜の再放送をのぞいて、新番組の第一回だけを地上波と衛星の両方から拾うルール',
}

export const 長い名前と条件は丸めない: Story = {
  args: {
    result: { items: [LONG_NAMED_RULE], total: 1 },
    editing: { state: 'rule', rule: LONG_NAMED_RULE },
    actions: recording([], []),
  },
}

export const 追加の置き場: Story = {
  args: { editing: { state: 'none' }, actions: recording([], []) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const add = canvas.getByRole('button', { name: 'ルールを追加' })
    const fromSearch = canvas.getByRole('link', { name: '検索から作成' })

    await expect(add).toHaveAttribute('data-variant', 'default')
    await expect(fromSearch).toHaveAttribute('data-variant', 'watch')

    const drawn = [add, fromSearch].map((one) => one.getBoundingClientRect())

    await expect(new Set(drawn.map((box) => Math.round(box.width))).size).toBe(
      1,
    )
    await expect(new Set(drawn.map((box) => Math.round(box.top))).size).toBe(1)

    const tabs = canvas.getByRole('link', { name: 'ルール' })

    await expect(
      Math.round(drawn[0].top) <
        Math.round(tabs.getBoundingClientRect().bottom) + 24,
    ).toBe(true)
  },
}

const noRulesSaved: Saved[] = []

export const ルールがひとつも無い: Story = {
  args: {
    result: { items: [], total: 0 },
    editing: { state: 'none' },
    actions: recording(noRulesSaved, []),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('heading', { name: 'まだルールがありません' }),
    ).toBeVisible()
    await expect(
      canvas.getByRole('button', { name: 'ルールを即時適用' }),
    ).toBeDisabled()
  },
}

export const 即時適用: Story = {
  args: { editing: { state: 'none' }, actions: recording([], []) },
  play: async ({ canvasElement }) => {
    const notice = await applyNow(canvasElement)

    await expect(applied).toEqual(['rule-301'])
    await expect(notice).toHaveClass('bg-mint-soft')
    await expect(notice).toHaveTextContent(
      'ルールを適用しました(新しく作られた予約 3 件、引っ込んだ予約 1 件)。1 件は除外されました(移動 1 件)。',
    )

    const tabs = within(canvasElement).getByRole('link', { name: 'ルール' })

    await expect(notice.getBoundingClientRect().top).toBeGreaterThan(
      tabs.getBoundingClientRect().bottom,
    )
  },
}

export const 即時適用で予約が作られない: Story = {
  args: {
    editing: { state: 'none' },
    actions: {
      ...recording([], []),
      ...applyingWith({
        state: 'ok',
        data: { ...APPLIED, made: 0, withdrawn: 0, excludedAsMoved: 0 },
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const notice = await applyNow(canvasElement)

    await expect(notice).toHaveTextContent(
      /^ルールを適用しました\(新しく作られた予約 0 件\)。$/,
    )
  },
}

export const 即時適用で作成できなかった予約がある: Story = {
  args: {
    editing: { state: 'none' },
    actions: {
      ...recording([], []),
      ...applyingWith({
        state: 'ok',
        data: {
          ...APPLIED,
          refused: 2,
          turnedOff: 1,
          faulted: 1,
          excludedAsMoved: 0,
        },
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const notice = await applyNow(canvasElement)

    await expect(notice).toHaveClass('bg-lemon-soft')
    await expect(notice).toHaveTextContent(
      'ルールを適用しました(新しく作られた予約 3 件、引っ込んだ予約 1 件、作成できなかった予約 2 件、条件を読めず無効にしたルール 1 件、調べられなかったルール 1 件)。',
    )
  },
}

export const 即時適用を断られる: Story = {
  args: {
    editing: { state: 'none' },
    actions: {
      ...recording([], []),
      ...applyingWith({
        state: 'rejected',
        message: 'ルールの適用がすでに実行中のため、適用できませんでした。',
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const notice = await applyNow(canvasElement)

    await expect(notice).toHaveClass('bg-lemon-soft')
    await expect(notice).toHaveTextContent(
      'ルールの適用がすでに実行中のため、適用できませんでした。',
    )
  },
}

export const 有効なルールが無いと即時適用できない: Story = {
  args: {
    result: {
      items: RULE_FIXTURES.map((rule) => ({ ...rule, enabled: false })),
      total: RULE_FIXTURES.length,
    },
    editing: { state: 'none' },
    actions: recording([], []),
  },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', {
      name: 'ルールを即時適用',
    })

    await expect(button).toBeDisabled()
    await expect(button).toHaveAttribute(
      'title',
      '有効なルールがないため、適用できません。',
    )
  },
}
