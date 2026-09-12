import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import type {
  Rule,
  RuleDraft,
  RuleImpact,
  RulePreview,
  RuleRetirement,
  RuleWrite,
} from '@/repository/rules'
import { RULE_CHANNEL_FIXTURES, RULE_FIXTURES } from '@/stories/fixtures/rules'
import type { RuleActions } from '@/components/reservations/rules-page'
import { RulesView } from '@/components/reservations/rules-page'

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
      whenLabel: '08/09(土) 22:00–22:30',
      channelName: '中央テレビ1',
      channelNo: '011',
      title: '星のさまよいびと 第1話',
      alreadyReserved: false,
      verdict: 'secured',
    },
    {
      id: '132-1320-9002',
      whenLabel: '08/10(日) 24:30–25:00',
      channelName: '湾岸放送1',
      channelNo: '041',
      title: '未明のレイライン 第1話',
      alreadyReserved: false,
      verdict: 'contended',
    },
    {
      id: '4-101-9003',
      whenLabel: '08/12(火) 25:05–25:35',
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
  excluded: 2,
}

const IMPACT: RuleImpact = {
  making: 2,
  withdrawing: 1,
  sweeping: 5,
  changingHands: 3,
  excluded: 2,
}

const RETIRED: RuleRetirement = { withdrawn: 4, swept: 0 }

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
  }
}

const meta = {
  title: 'Screens/ルール',
  component: RulesView,
  parameters: { layout: 'fullscreen' },
  args: {
    result: { items: RULE_FIXTURES, total: RULE_FIXTURES.length },
    channels: RULE_CHANNEL_FIXTURES,
  },
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
      canvas.getByRole('link', { name: '検索から作る' }),
    ).toHaveAttribute('href', '/search')

    await expect(
      canvas.getByRole('switch', { name: '深夜アニメを追う を有効にする' }),
    ).toBeChecked()
    await expect(
      canvas.getByRole('switch', { name: 'ドラマの最終回だけ を有効にする' }),
    ).not.toBeChecked()

    await userEvent.click(
      canvas.getByRole('switch', { name: 'ドラマの最終回だけ を有効にする' }),
    )

    await waitFor(() => expect(listTurned).toEqual([['rule-303', true]]))
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

    await expect(canvas.getByLabelText('ルール名')).toHaveValue(
      '深夜アニメを追う',
    )
    await expect(canvas.getByLabelText('キーワード')).toHaveValue('新番組')
    await expect(canvas.getByLabelText('除外キーワード')).toHaveValue('再放送')
    await expect(canvas.getByLabelText('優先度')).toHaveValue('20')

    await expect(
      canvas.getByRole('link', { name: '番組検索で見る' }),
    ).toHaveAttribute(
      'href',
      '/search?q=%E6%96%B0%E7%95%AA%E7%B5%84&exclude=%E5%86%8D%E6%94%BE%E9%80%81&genre=anime',
    )

    await userEvent.click(canvas.getByRole('button', { name: '下見する' }))

    await expect(
      await canvas.findByText('星のさまよいびと 第1話'),
    ).toBeVisible()
    await expect(canvas.getByText('未明のレイライン 第1話')).toBeVisible()
    await expect(canvas.getByText('クロックワークガーデン 第1話')).toBeVisible()
    await expect(canvas.getByText(/件は除外されました/)).toHaveTextContent(
      '2 件は除外されました。',
    )

    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    const dialog = within(await screen.findByRole('dialog'))

    await expect(
      await dialog.findByText(/新しく作られる予約/),
    ).toHaveTextContent('新しく作られる予約 2 件')
    await expect(dialog.getByText(/引っ込む予約/)).toHaveTextContent(
      '引っ込む予約 1 件',
    )
    await expect(
      dialog.getByText(/このルールに付け替わる予約/),
    ).toHaveTextContent('このルールに付け替わる予約 3 件')

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
              kind: undefined,
              channels: [],
            },
            priority: 20,
            enabled: true,
            marginBeforeSeconds: 10,
            marginAfterSeconds: 30,
          },
        },
      ]),
    )

    retired.length = 0
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
        channels: ['132-1320'],
      },
    },
    actions: recording(draftSaved, []),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    draftSaved.length = 0

    await expect(canvas.getByLabelText('キーワード')).toHaveValue('特別警報')
    await expect(canvas.getByText('湾岸放送1')).toBeVisible()

    await userEvent.click(canvas.getByRole('button', { name: '保存' }))
    await expect(
      await canvas.findByText('ルール名は 1 〜 128 文字です。'),
    ).toBeVisible()
    await expect(screen.queryByRole('dialog')).toBeNull()
    await expect(draftSaved).toEqual([])

    await userEvent.type(canvas.getByLabelText('ルール名'), '気象・災害特番')
    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    const dialog = within(await screen.findByRole('dialog'))
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
              kind: undefined,
              channels: ['132-1320'],
            },
            priority: 10,
            enabled: true,
            marginBeforeSeconds: 0,
            marginAfterSeconds: 0,
          },
        },
      ]),
    )
  },
}

const seriesSaved: Saved[] = []

export const 番組詳細から作る: Story = {
  args: {
    editing: {
      state: 'new',
      terms: {
        q: '星のさまよいびと',
        exclude: undefined,
        fields: 'title',
        genres: [],
        channels: ['4-101'],
      },
    },
    actions: recording(seriesSaved, []),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    seriesSaved.length = 0

    await expect(canvas.getByLabelText('キーワード')).toHaveValue(
      '星のさまよいびと',
    )
    await expect(canvas.getByLabelText('対象フィールド')).toHaveTextContent(
      '番組名だけ',
    )
    await expect(canvas.getByText('衛星第一')).toBeVisible()

    await userEvent.type(canvas.getByLabelText('ルール名'), '星のさまよいびと')
    await userEvent.click(canvas.getByRole('button', { name: '保存' }))
    await expect(seriesSaved).toEqual([])

    const dialog = within(await screen.findByRole('dialog'))

    await expect(
      await dialog.findByText(/新しく作られる予約/),
    ).toHaveTextContent('新しく作られる予約 2 件')
    await expect(seriesSaved).toEqual([])

    await userEvent.click(dialog.getByRole('button', { name: '保存する' }))

    await waitFor(() => expect(seriesSaved).toHaveLength(1))
    await expect(seriesSaved[0].draft.terms.fields).toBe('title')
    await expect(seriesSaved[0].draft.terms.channels).toEqual(['4-101'])
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
        channels: [],
      },
    },
    actions: recording(emptySaved, []),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    emptySaved.length = 0

    await userEvent.type(canvas.getByLabelText('ルール名'), 'なんでも録る')
    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    await expect(
      await canvas.findByText(
        'キーワード・除外キーワード・ジャンル・種別・チャンネルのうち、1 つ以上を指定してください。',
      ),
    ).toBeVisible()
    await expect(screen.queryByRole('dialog')).toBeNull()
    await expect(emptySaved).toEqual([])

    await userEvent.type(canvas.getByLabelText('キーワード'), '台風')
    await userEvent.click(canvas.getByRole('button', { name: '保存' }))

    const dialog = within(await screen.findByRole('dialog'))
    await userEvent.click(
      await dialog.findByRole('button', { name: '保存する' }),
    )

    await waitFor(() => expect(emptySaved).toHaveLength(1))
    await expect(emptySaved[0].draft.terms.q).toBe('台風')
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
          'チューナーの空きを数えられないため、影響を数えられませんでした。時間をおいてからお試しください。',
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
        'チューナーの空きを数えられないため、影響を数えられませんでした。時間をおいてからお試しください。',
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

    await userEvent.clear(canvas.getByLabelText('ルール名'))
    await userEvent.type(canvas.getByLabelText('ルール名'), '書きかけの名前')
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
    await expect(canvas.getByLabelText('ルール名')).toHaveValue(
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
