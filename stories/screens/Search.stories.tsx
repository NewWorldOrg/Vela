import type { CSSProperties } from 'react'
import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'
import { getRouter } from '@storybook/nextjs/navigation.mock'
import {
  expect,
  fireEvent,
  fn,
  screen,
  userEvent,
  waitFor,
  within,
} from 'storybook/test'

import type {
  SearchCondition,
  SearchHit,
  SearchHits,
  SearchResult,
} from '@/repository/search'
import type { GuideChannel } from '@/repository/programs'
import type {
  NotificationWrite,
  Noticing,
  WatchDraft,
  WatchWrite,
} from '@/lib/notifications'
import {
  SEARCH_MOST_CHANNELS,
  narrowsAnything,
  searchConditionOfQuery,
} from '@/repository/search-options'
import {
  MORE_HITS_THAN_FIT,
  SEARCH_CHANNEL_FIXTURES,
  SEARCH_HIT_FIXTURES,
} from '@/repository/search.fixtures'
import { SearchView } from '@/components/search/search-view'
import {
  NOTIFY_START,
  STOP_NOTIFYING,
} from '@/components/notifications/programme-notice'
import { afterTheArrival } from '@/stories/after-the-arrival'
import { standsOnAGround } from '@/stories/stands-on-a-ground'
import { inTheApp } from '@/stories/frames'
import { FROM_600, PHONE } from '@/stories/rows-as-cards'

const emptyCondition: SearchCondition = {
  fields: 'title,description',
  genres: [],
  subgenres: [],
  channels: [],
  days: [],
  sort: 'start_at.asc',
  perPage: 20,
  page: 1,
}

const condition: SearchCondition = {
  ...emptyCondition,
  q: '観測所',
  from: '2026-08-09',
  to: '2026-08-15',
}

const everyCondition: SearchCondition = {
  ...condition,
  q: '夏 絶景',
  exclude: '再放送',
  fields: 'title',
  genres: ['documentary', 'movie'],
  subgenres: ['7-0'],
  kind: 'terrestrial',
  channels: [
    SEARCH_CHANNEL_FIXTURES[0].id,
    SEARCH_CHANNEL_FIXTURES[1].id,
    SEARCH_CHANNEL_FIXTURES[2].id,
  ],
  days: ['saturday', 'sunday'],
}

const channels = SEARCH_CHANNEL_FIXTURES

const manyChannels: GuideChannel[] = Array.from(
  { length: SEARCH_MOST_CHANNELS + 4 },
  (_, index) => ({
    id: `4-${1000 + index}`,
    no: String(100 + index),
    name: `チャンネル${index + 1}`,
    kind: 'bs' as const,
    networkId: 4,
    serviceId: 1000 + index,
    sortKey: [1, 0, index] as [number, number, number],
  }),
)

function arriveAt(href: string): SearchCondition {
  return searchConditionOfQuery(href.split('?')[1] ?? '')
}

function answering(
  result: SearchResult,
  condition: SearchCondition,
): SearchResult {
  return {
    ...result,
    condition,
    outcome: narrowsAnything(condition) ? result.outcome : { state: 'idle' },
  }
}

function Live({ result }: { result: SearchResult }) {
  const [condition, setCondition] = useState<SearchCondition>(result.condition)

  getRouter().push.mockImplementation((href: string) => {
    setCondition(arriveAt(href))
  })
  getRouter().replace.mockImplementation((href: string) => {
    setCondition(arriveAt(href))
  })

  return <SearchView result={answering(result, condition)} />
}

const BROWSER_BUTTON = {
  minWidth: '48px',
  minHeight: '48px',
  padding: '0 12px',
  background: '#ffffff',
  color: '#111111',
  border: '1px solid #111111',
  borderRadius: '4px',
}

function browserButton(shut: boolean): CSSProperties {
  return { ...BROWSER_BUTTON, cursor: shut ? 'not-allowed' : 'pointer' }
}

function Visited({ result }: { result: SearchResult }) {
  const [entries, setEntries] = useState<SearchCondition[]>([result.condition])
  const [at, setAt] = useState<number>(0)

  getRouter().push.mockImplementation((href: string) => {
    setEntries((kept) => [...kept.slice(0, at + 1), arriveAt(href)])
    setAt((standing) => standing + 1)
  })
  getRouter().replace.mockImplementation((href: string) => {
    setEntries((kept) =>
      kept.map((one, index) => (index === at ? arriveAt(href) : one)),
    )
  })

  return (
    <>
      <div style={{ display: 'flex', gap: '12px', padding: '16px' }}>
        <button
          type="button"
          style={browserButton(at === 0)}
          disabled={at === 0}
          onClick={() => setAt((standing) => standing - 1)}
        >
          ブラウザの戻る
        </button>
        <button
          type="button"
          style={browserButton(at === entries.length - 1)}
          disabled={at === entries.length - 1}
          onClick={() => setAt((standing) => standing + 1)}
        >
          ブラウザの進む
        </button>
      </div>
      <SearchView result={answering(result, entries[at])} />
    </>
  )
}

async function choose(list: string, option: string): Promise<void> {
  await userEvent.click(screen.getByRole('combobox', { name: list }))
  await userEvent.click(await screen.findByRole('option', { name: option }))

  await afterTheArrival(document.body)
}

const NO_LONGER_KEPT = '放送が終了した番組は結果に出ません'

function saysNothingItCannotKeep(
  canvas: ReturnType<typeof within>,
): Promise<void> {
  return expect(
    canvas.queryAllByText(new RegExp(NO_LONGER_KEPT)),
    '放送済みの番組は出ないという約束が画面に戻っている',
  ).toHaveLength(0)
}

function picked(kind: string): string[] {
  return screen
    .queryAllByRole('button', { name: new RegExp(`^${kind} .+ を外す$`) })
    .map((one) => one.getAttribute('aria-label') ?? '')
}

function fillDate(field: HTMLElement, date: string): void {
  fireEvent.change(field, { target: { value: date } })
}

function words(canvas: ReturnType<typeof within>): HTMLElement {
  return canvas.getByRole('searchbox', { name: 'キーワード' })
}

function chipOf(canvas: ReturnType<typeof within>, name: string): HTMLElement {
  return canvas.getByRole('button', { name: new RegExp(`^${name} `) })
}

/** Opens a condition's panel from its pill and hands back the panel. */
async function openPanel(
  canvas: ReturnType<typeof within>,
  name: string,
): Promise<HTMLElement> {
  await userEvent.click(chipOf(canvas, name))

  const panel = await screen.findByRole('dialog', { name })

  await afterTheArrival(document.body)

  return panel
}

/** Closes the panel open, which searches what was set in it. */
async function closePanel(): Promise<void> {
  await userEvent.keyboard('{Escape}')
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
}

async function press(panel: HTMLElement, name: string): Promise<void> {
  await userEvent.click(within(panel).getByRole('button', { name }))
}

function ruleLink(canvas: ReturnType<typeof within>): HTMLElement {
  return canvas.getByRole('link', { name: 'この条件でルールを作成' })
}

const reservedHere: string[] = []

const takenBackHere: string[] = []

const meta = {
  title: 'Screens/番組表/番組検索',
  component: SearchView,
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true, navigation: { pathname: '/search' } },
  },
  args: {
    onReserve: async (programmeId: string) => {
      reservedHere.push(programmeId)

      return { state: 'ok' as const, reservationId: `r-${programmeId}` }
    },
    onCancel: async (id: string) => {
      takenBackHere.push(id)

      return { state: 'ok' as const }
    },
    onRestore: async () => ({ state: 'ok' as const }),
  },
  beforeEach: () => {
    reservedHere.length = 0
    takenBackHere.length = 0
  },
  decorators: [inTheApp],
} satisfies Meta<typeof SearchView>

export default meta
type Story = StoryObj<typeof meta>

const searched = (found: SearchHits): SearchResult['outcome'] => ({
  state: 'searched',
  found,
})

export const 入力前: Story = {
  args: {
    result: {
      condition: emptyCondition,
      channels,
      outcome: { state: 'idle' },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('まだ検索結果がありません')).toBeVisible()
    await expect(words(canvas)).toHaveFocus()
    await expect(
      canvas.getByRole('button', { name: 'この条件でルールを作成' }),
    ).toBeDisabled()
    await expect(
      canvas.getByRole('link', { name: '番組表へ' }),
    ).toHaveAttribute('href', '/guide')
    await expect(
      canvas.queryByRole('button', { name: '条件を解除' }),
    ).toBeNull()
    await expect(
      canvasElement.querySelector('[data-slot="top-bar"] form[role="search"]'),
      '番組検索の上の帯にもう 1 つ検索の欄がある',
    ).toBeNull()
    await saysNothingItCannotKeep(canvas)
  },
}

export const キーワードなしで検索: Story = {
  args: {
    result: {
      condition: {
        ...emptyCondition,
        genres: ['documentary'],
        kind: 'terrestrial',
      },
      channels,
      outcome: searched({
        hits: SEARCH_HIT_FIXTURES.slice(0, 4),
        total: 4,
        page: 1,
        lastPage: 1,
        perPage: 20,
        rangeFrom: 1,
        rangeTo: 4,
      }),
    },
  },
}

export const 条件をすべて指定: Story = {
  args: {
    result: {
      condition: everyCondition,
      channels,
      outcome: searched({
        hits: SEARCH_HIT_FIXTURES.slice(0, 6),
        total: 6,
        page: 1,
        lastPage: 1,
        perPage: 20,
        rangeFrom: 1,
        rangeTo: 6,
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      window.innerWidth,
    )
    await expect(chipOf(canvas, '期間')).toHaveTextContent('8/9〜8/15')
  },
}

export const 検索結果: Story = {
  args: {
    result: {
      condition,
      channels,
      outcome: searched({
        hits: SEARCH_HIT_FIXTURES,
        total: 67,
        page: 1,
        lastPage: 4,
        perPage: 20,
        rangeFrom: 1,
        rangeTo: 20,
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const hits = canvasElement.querySelector<HTMLElement>(
      '[data-slot="search-hits"]',
    )!

    await expect(
      canvas.getByRole('heading', { name: '検索結果' }),
    ).toBeInTheDocument()
    await expect(hits.querySelectorAll('li[data-programme]')).toHaveLength(
      SEARCH_HIT_FIXTURES.length,
    )
    await expect(
      canvas.getByRole('link', { name: SEARCH_HIT_FIXTURES[0].title }),
    ).toHaveAttribute('href', `/guide/programs/${SEARCH_HIT_FIXTURES[0].id}`)
    await expect(
      within(hits).getByRole('region', { name: '今日 8/9(土)' }),
    ).toBeVisible()
    await expect(
      within(hits).getByRole('region', { name: '8/11(月)' }),
    ).toBeVisible()
    await expect(canvas.getByText(/67 件/)).toBeVisible()
    await saysNothingItCannotKeep(canvas)
  },
}

export const 予約は1回押すだけ: Story = {
  args: 検索結果.args,
  play: async ({ canvasElement }) => {
    const hits = canvasElement.querySelector<HTMLElement>(
      '[data-slot="search-hits"]',
    )!
    const [, second] = SEARCH_HIT_FIXTURES
    const row = hits.querySelector<HTMLElement>(
      `[data-programme="${second.id}"]`,
    )!
    const pill = within(row).getByRole('button', { name: '予約' })

    await expect(pill).toHaveAttribute('aria-pressed', 'false')
    await expect(pill.getBoundingClientRect().height).toBeGreaterThanOrEqual(34)

    await userEvent.click(pill)

    await waitFor(() => expect(reservedHere).toEqual([second.id]))
    await waitFor(() =>
      expect(
        within(row).getByRole('button', { name: '予約済み' }),
      ).toHaveAttribute('aria-pressed', 'true'),
    )
    await waitFor(() =>
      Promise.all(
        within(row)
          .getByRole('button', { name: '予約済み' })
          .getAnimations()
          .map((one) => one.finished),
      ),
    )
    await standsOnAGround(within(row).getByRole('button', { name: '予約済み' }))
    await expect(await screen.findByText(/予約しました/)).toHaveTextContent(
      second.title,
    )
  },
}

export const URLをコピーする: Story = {
  args: 検索結果.args,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: 'この条件の URL をコピー' }),
    )

    await expect(
      await screen.findByText(/^コピー(しました|できません)$/),
    ).toBeVisible()
  },
}

export const ページ送り: Story = {
  args: {
    result: {
      condition: { ...condition, page: 3 },
      channels,
      outcome: searched({
        hits: SEARCH_HIT_FIXTURES,
        total: 67,
        page: 3,
        lastPage: 4,
        perPage: 20,
        rangeFrom: 41,
        rangeTo: 60,
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText(/41–60 件目/)).toBeVisible()
    await expect(
      canvas.getByRole('button', { name: '4 ページ目' }),
    ).toBeVisible()
  },
}

export const 該当なし: Story = {
  args: {
    result: {
      condition: { ...emptyCondition, q: '見つからない語', exclude: '再放送' },
      channels,
      outcome: searched({
        hits: [],
        total: 0,
        page: 1,
        lastPage: 1,
        perPage: 20,
        rangeFrom: 0,
        rangeTo: 0,
      }),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const empty = canvas
      .getByText('条件に合う番組がありません')
      .closest<HTMLElement>('[data-slot="empty-state"]')

    await expect(empty).not.toBeNull()
    await expect(
      within(empty as HTMLElement).getByRole('button', {
        name: '条件を解除',
      }),
    ).toBeVisible()
    await saysNothingItCannotKeep(canvas)
  },
}

export const 条件不備: Story = {
  args: {
    result: {
      condition: { ...emptyCondition, q: 'あ' },
      channels,
      outcome: {
        state: 'refused',
        message:
          'キーワード・除外キーワードは、指定する場合は 2 文字以上にしてください。期間は開始日から終了日へ向かう最長 31 日の範囲で指定できます。',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText(/2 文字以上にしてください/)).toBeVisible()
    await saysNothingItCannotKeep(canvas)
  },
}

export const ジャンルを2つ選ぶ: Story = {
  args: {
    result: {
      condition: emptyCondition,
      channels,
      outcome: { state: 'idle' },
    },
  },
  render: (args) => <Live {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const router = getRouter()
    const panel = await openPanel(canvas, 'ジャンル')

    await press(panel, 'ニュース/報道')
    await press(panel, 'ドキュメンタリー/教養')

    await expect(
      within(panel).getByRole('button', { name: 'ニュース/報道' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(
      within(panel).getByRole('button', { name: 'ドキュメンタリー/教養' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(router.push).not.toHaveBeenCalled()

    await closePanel()

    await waitFor(async () => {
      await expect(router.push).toHaveBeenLastCalledWith(
        '/search?genre=news&genre=documentary',
        { scroll: false },
      )
    })
    await expect(router.push).toHaveBeenCalledTimes(1)
    await waitFor(async () => {
      await expect(chipOf(canvas, 'ジャンル')).toHaveTextContent(
        'ジャンルニュース/報道・ドキュメンタリー/教養',
      )
    })
  },
}

export const ジャンルを外す: Story = {
  args: {
    result: {
      condition: { ...emptyCondition, genres: ['news', 'documentary'] },
      channels,
      outcome: { state: 'idle' },
    },
  },
  render: (args) => <Live {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const router = getRouter()
    const panel = await openPanel(canvas, 'ジャンル')

    await press(panel, 'ニュース/報道')

    await expect(
      within(panel).getByRole('button', { name: 'ニュース/報道' }),
    ).toHaveAttribute('aria-pressed', 'false')

    await closePanel()

    await waitFor(async () => {
      await expect(router.push).toHaveBeenLastCalledWith(
        '/search?genre=documentary',
        { scroll: false },
      )
    })
    await waitFor(async () => {
      await expect(chipOf(canvas, 'ジャンル')).toHaveTextContent(
        'ジャンルドキュメンタリー/教養',
      )
    })
  },
}

export const キーワードを足して検索: Story = {
  args: {
    result: {
      condition: { ...emptyCondition, genres: ['news'] },
      channels,
      outcome: { state: 'idle' },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const router = getRouter()

    await userEvent.type(words(canvas), '夏 絶景{enter}')

    await waitFor(async () => {
      await expect(router.push).toHaveBeenLastCalledWith(
        '/search?q=%E5%A4%8F+%E7%B5%B6%E6%99%AF&genre=news',
        { scroll: false },
      )
    })
  },
}

export const 面の条件は閉じるまで走らず閉じるとまとめて走る: Story = {
  args: {
    result: {
      condition: emptyCondition,
      channels,
      outcome: { state: 'idle' },
    },
  },
  render: (args) => <Live {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const router = getRouter()

    const stillNothingAskedFor = async (after: string) => {
      await expect(
        router.push,
        `${after} asked the store for something on its own`,
      ).not.toHaveBeenCalled()
      await expect(
        router.replace,
        `${after} asked the store for something on its own`,
      ).not.toHaveBeenCalled()
    }

    await stillNothingAskedFor('drawing the screen')

    await userEvent.type(words(canvas), ' 夏 絶景 ')
    await stillNothingAskedFor('キーワード')

    const leftOut = await openPanel(canvas, '除外キーワード')

    await userEvent.type(
      within(leftOut).getByRole('textbox', { name: '除外キーワード' }),
      ' 再放送 ',
    )
    await stillNothingAskedFor('除外キーワード')

    await closePanel()

    const period = await openPanel(canvas, '期間')

    fillDate(within(period).getByLabelText('期間の開始日'), '2026-08-09')
    fillDate(within(period).getByLabelText('期間の終了日'), '2026-08-15')

    await expect(router.push).toHaveBeenCalledTimes(1)

    await closePanel()

    await waitFor(async () => {
      await expect(router.push).toHaveBeenLastCalledWith(
        '/search?q=%E5%A4%8F+%E7%B5%B6%E6%99%AF&exclude=%E5%86%8D%E6%94%BE%E9%80%81' +
          '&from=2026-08-09&to=2026-08-15',
        { scroll: false },
      )
    })
    await expect(router.push).toHaveBeenCalledTimes(2)

    await choose('対象範囲', '番組名だけ')

    await waitFor(async () => {
      await expect(router.push).toHaveBeenLastCalledWith(
        '/search?q=%E5%A4%8F+%E7%B5%B6%E6%99%AF&exclude=%E5%86%8D%E6%94%BE%E9%80%81' +
          '&fields=title&from=2026-08-09&to=2026-08-15',
        { scroll: false },
      )
    })

    const unchanged = await openPanel(canvas, '曜日')

    await expect(
      within(unchanged).getAllByRole('button', { pressed: false }),
    ).toHaveLength(7)
    await closePanel()

    await expect(
      router.push,
      '開いて閉じただけで頼み直した',
    ).toHaveBeenCalledTimes(3)
    await expect(router.replace).not.toHaveBeenCalled()
  },
}

export const 欄でEnterを押しても検索が走る: Story = {
  args: {
    result: {
      condition: emptyCondition,
      channels,
      outcome: { state: 'idle' },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const router = getRouter()

    await userEvent.type(words(canvas), '夏{enter}')

    await waitFor(async () => {
      await expect(router.push).toHaveBeenLastCalledWith(
        '/search?q=%E5%A4%8F',
        {
          scroll: false,
        },
      )
    })

    const leftOut = await openPanel(canvas, '除外キーワード')

    await userEvent.type(
      within(leftOut).getByRole('textbox', { name: '除外キーワード' }),
      '再放送{enter}',
    )

    await waitFor(async () => {
      await expect(router.push).toHaveBeenLastCalledWith(
        '/search?q=%E5%A4%8F&exclude=%E5%86%8D%E6%94%BE%E9%80%81',
        { scroll: false },
      )
    })
  },
}

export const 変換を確定するEnterは検索を頼まない: Story = {
  args: {
    result: {
      condition: emptyCondition,
      channels,
      outcome: { state: 'idle' },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const router = getRouter()
    const field = words(canvas)

    await userEvent.type(field, '夏')

    const settling = fireEvent.keyDown(field, {
      key: 'Enter',
      isComposing: true,
    })

    await expect(
      settling,
      '変換を確定する Enter が送信に使われるままになっている',
    ).toBe(false)
    await expect(router.push).not.toHaveBeenCalled()

    const asking = fireEvent.keyDown(field, {
      key: 'Enter',
      isComposing: false,
    })

    await expect(asking, '変換していないときの Enter まで取り上げている').toBe(
      true,
    )

    await userEvent.type(field, '{enter}')

    await waitFor(async () => {
      await expect(router.push).toHaveBeenLastCalledWith(
        '/search?q=%E5%A4%8F',
        {
          scroll: false,
        },
      )
    })
  },
}

export const 並び替えと表示件数とページ送りはその場で効く: Story = {
  args: 検索結果.args,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const router = getRouter()
    const asked =
      '/search?q=%E8%A6%B3%E6%B8%AC%E6%89%80&from=2026-08-09&to=2026-08-15'

    await choose('並び替え', '番組名順')

    await waitFor(async () => {
      await expect(router.replace).toHaveBeenLastCalledWith(
        `${asked}&sort=name.asc`,
        { scroll: false },
      )
    })

    await choose('表示件数', '50 件ずつ')

    await waitFor(async () => {
      await expect(router.replace).toHaveBeenLastCalledWith(
        `${asked}&per_page=50`,
        { scroll: false },
      )
    })

    await userEvent.click(canvas.getByRole('button', { name: '2 ページ目' }))

    await waitFor(async () => {
      await expect(router.push).toHaveBeenLastCalledWith(`${asked}&page=2`, {
        scroll: false,
      })
    })
  },
}

export const 入力中の語は見せ方を変えても確定しない: Story = {
  args: 検索結果.args,
  render: (args) => <Live {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const router = getRouter()

    await userEvent.type(words(canvas), 'の夏')

    await choose('並び替え', '番組名順')

    await waitFor(async () => {
      await expect(router.replace).toHaveBeenLastCalledWith(
        '/search?q=%E8%A6%B3%E6%B8%AC%E6%89%80&from=2026-08-09&to=2026-08-15&sort=name.asc',
        { scroll: false },
      )
    })

    await waitFor(async () => {
      await expect(
        canvas.getByRole('combobox', { name: '並び替え' }),
      ).toHaveTextContent('番組名順')
    })

    await expect(words(canvas)).toHaveValue('観測所の夏')
    await expect(router.push).not.toHaveBeenCalled()
  },
}

export const ルールの行き先は押す前から手元の条件を映す: Story = {
  args: {
    result: {
      condition: emptyCondition,
      channels,
      outcome: { state: 'idle' },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const router = getRouter()

    await expect(
      canvas.queryByRole('link', { name: 'この条件でルールを作成' }),
    ).toBeNull()
    await expect(
      canvas.getByRole('button', { name: 'この条件でルールを作成' }),
    ).toBeDisabled()

    await userEvent.type(words(canvas), '夏 絶景')

    await waitFor(async () => {
      await expect(ruleLink(canvas)).toHaveAttribute(
        'href',
        '/reservations/rules?rule=new&q=%E5%A4%8F+%E7%B5%B6%E6%99%AF',
      )
    })

    const panel = await openPanel(canvas, 'ジャンル')

    await press(panel, '映画')

    await expect(ruleLink(canvas)).toHaveAttribute(
      'href',
      '/reservations/rules?rule=new&q=%E5%A4%8F+%E7%B5%B6%E6%99%AF&genre=movie',
    )
    await expect(router.push).not.toHaveBeenCalled()
    await expect(router.replace).not.toHaveBeenCalled()
  },
}

export const サブジャンルと曜日を選ぶ: Story = {
  args: {
    result: {
      condition: { ...emptyCondition, genres: ['anime'] },
      channels,
      outcome: { state: 'idle' },
    },
  },
  render: (args) => <Live {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const router = getRouter()
    const days = await openPanel(canvas, '曜日')

    await press(days, '水曜')
    await press(days, '月曜')
    await closePanel()

    await waitFor(async () => {
      await expect(router.push).toHaveBeenLastCalledWith(
        '/search?genre=anime&day=monday&day=wednesday',
        { scroll: false },
      )
    })
    await waitFor(async () => {
      await expect(chipOf(canvas, '曜日')).toHaveTextContent('曜日月・水')
    })

    const genre = await openPanel(canvas, 'ジャンル')

    await userEvent.click(
      within(genre).getByRole('combobox', { name: 'サブジャンルを追加' }),
    )
    await expect(
      await screen.findByRole('group', { name: 'ドラマ' }),
    ).toBeVisible()
    await expect(
      screen.queryByRole('group', { name: 'アニメ/特撮' }),
    ).toBeNull()
    await userEvent.click(screen.getByRole('option', { name: '海外ドラマ' }))
    await afterTheArrival(document.body)

    await waitFor(async () => {
      await expect(picked('サブジャンル')).toEqual([
        'サブジャンル 海外ドラマ(ドラマ) を外す',
      ])
    })
    await expect(ruleLink(canvas)).toHaveAttribute(
      'href',
      '/reservations/rules?rule=new&genre=anime&subgenre=3-1&day=monday&day=wednesday',
    )
    await expect(router.push).toHaveBeenCalledTimes(1)

    await closePanel()

    await waitFor(async () => {
      await expect(router.push).toHaveBeenLastCalledWith(
        '/search?genre=anime&subgenre=3-1&day=monday&day=wednesday',
        { scroll: false },
      )
    })
    await waitFor(async () => {
      await expect(chipOf(canvas, 'ジャンル')).toHaveTextContent(
        'ジャンルアニメ/特撮・海外ドラマ(ドラマ)',
      )
    })
  },
}

export const 曜日を全選択して解除する: Story = {
  args: {
    result: {
      condition: { ...emptyCondition, days: ['saturday', 'sunday'] },
      channels,
      outcome: { state: 'idle' },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const days = await openPanel(canvas, '曜日')
    const pressed = () =>
      within(days)
        .queryAllByRole('button', { pressed: true })
        .map((one) => one.textContent)

    await expect(pressed()).toEqual(['土曜', '日曜'])

    await press(days, '曜日を全選択')

    await expect(pressed()).toHaveLength(7)
    await expect(
      within(days).getByRole('button', { name: '曜日を全選択' }),
    ).toBeDisabled()
    await expect(chipOf(canvas, '曜日')).toHaveTextContent('曜日すべて')

    await press(days, '曜日の選択を解除')

    await expect(pressed()).toEqual([])
    await expect(
      within(days).getByRole('button', { name: '曜日の選択を解除' }),
    ).toBeDisabled()
    await expect(
      within(days).getByRole('button', { name: '曜日を全選択' }),
    ).toBeEnabled()
  },
}

export const サブジャンルや曜日だけでもルールを作れる: Story = {
  args: {
    result: {
      condition: emptyCondition,
      channels,
      outcome: { state: 'idle' },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const days = await openPanel(canvas, '曜日')

    await press(days, '金曜')

    await expect(ruleLink(canvas)).toHaveAttribute(
      'href',
      '/reservations/rules?rule=new&day=friday',
    )

    await press(days, '金曜')

    await expect(
      canvas.getByRole('button', { name: 'この条件でルールを作成' }),
    ).toBeDisabled()

    await closePanel()

    const genre = await openPanel(canvas, 'ジャンル')

    await choose('サブジャンルを追加', '国内アニメ')

    await expect(
      within(genre).getByRole('button', {
        name: 'サブジャンル 国内アニメ(アニメ/特撮) を外す',
      }),
    ).toBeVisible()
    await expect(ruleLink(canvas)).toHaveAttribute(
      'href',
      '/reservations/rules?rule=new&subgenre=7-0',
    )
  },
}

export const 曜日を7つとも選ぶと条件に数えない: Story = {
  args: {
    result: {
      condition: {
        ...emptyCondition,
        days: [
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ],
      },
      channels,
      outcome: { state: 'idle' },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(chipOf(canvas, '曜日')).toHaveTextContent(
      '曜日月・火・水・木・金・土',
    )
    await expect(ruleLink(canvas)).toBeVisible()

    const days = await openPanel(canvas, '曜日')

    await press(days, '日曜')

    await expect(chipOf(canvas, '曜日')).toHaveTextContent('曜日すべて')
    await expect(
      canvas.getByRole('button', { name: 'この条件でルールを作成' }),
    ).toBeDisabled()
  },
}

export const 開いた住所の条件が欄に入っている: Story = {
  args: 条件をすべて指定.args,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(words(canvas)).toHaveValue('夏 絶景')
    await expect(chipOf(canvas, '除外キーワード')).toHaveTextContent('再放送')
    await expect(
      canvas.getByRole('combobox', { name: '対象範囲' }),
    ).toHaveTextContent('番組名だけ')
    await expect(
      canvas.getByRole('combobox', { name: '種別' }),
    ).toHaveTextContent('地上波')
    await expect(chipOf(canvas, 'ジャンル')).toHaveTextContent(
      'ドキュメンタリー/教養・映画・国内アニメ(アニメ/特撮)',
    )
    await expect(chipOf(canvas, 'チャンネル')).toHaveTextContent(
      [0, 1, 2].map((nth) => SEARCH_CHANNEL_FIXTURES[nth].name).join('・'),
    )
    await expect(chipOf(canvas, '曜日')).toHaveTextContent('土・日')

    const genre = await openPanel(canvas, 'ジャンル')

    await expect(
      within(genre).getByRole('button', { name: '映画' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(picked('サブジャンル')).toEqual([
      'サブジャンル 国内アニメ(アニメ/特撮) を外す',
    ])

    await closePanel()

    const period = await openPanel(canvas, '期間')

    await expect(within(period).getByLabelText('期間の開始日')).toHaveValue(
      '2026-08-09',
    )
    await expect(within(period).getByLabelText('期間の終了日')).toHaveValue(
      '2026-08-15',
    )
    await closePanel()
    await expect(getRouter().push).not.toHaveBeenCalled()
  },
}

export const 戻ると前の条件が欄に戻る: Story = {
  args: {
    result: {
      condition: emptyCondition,
      channels,
      outcome: { state: 'idle' },
    },
  },
  render: (args) => <Visited {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.type(words(canvas), '夏 絶景{enter}')

    await waitFor(async () => {
      await expect(
        canvas.getByRole('button', { name: 'ブラウザの戻る' }),
      ).toBeEnabled()
    })

    await userEvent.click(
      canvas.getByRole('button', { name: 'ブラウザの戻る' }),
    )

    await waitFor(async () => {
      await expect(words(canvas)).toHaveValue('')
    })
    await expect(canvas.getByText('まだ検索結果がありません')).toBeVisible()

    await userEvent.click(
      canvas.getByRole('button', { name: 'ブラウザの進む' }),
    )

    await waitFor(async () => {
      await expect(words(canvas)).toHaveValue('夏 絶景')
    })
  },
}

export const 住所が空でも条件を消すと欄が空になる: Story = {
  args: {
    result: {
      condition: emptyCondition,
      channels,
      outcome: { state: 'idle' },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.type(words(canvas), '夏 絶景')

    const panel = await openPanel(canvas, 'ジャンル')

    await press(panel, '映画')
    await userEvent.keyboard('{Escape}')

    await userEvent.click(canvas.getByRole('button', { name: '条件を解除' }))

    await waitFor(async () => {
      await expect(words(canvas)).toHaveValue('')
    })
    await expect(chipOf(canvas, 'ジャンル')).toHaveTextContent('ジャンルすべて')
  },
}

export const 頼み直すと最初のページから: Story = {
  args: {
    result: {
      condition: { ...condition, page: 3 },
      channels,
      outcome: searched({
        hits: SEARCH_HIT_FIXTURES,
        total: 67,
        page: 3,
        lastPage: 4,
        perPage: 20,
        rangeFrom: 41,
        rangeTo: 60,
      }),
    },
  },
  render: (args) => <Live {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const router = getRouter()
    const asked =
      '/search?q=%E8%A6%B3%E6%B8%AC%E6%89%80&from=2026-08-09&to=2026-08-15'
    const asking =
      '/search?q=%E8%A6%B3%E6%B8%AC%E6%89%80%E3%81%AE%E5%A4%8F' +
      '&from=2026-08-09&to=2026-08-15'

    const walkOut = async (to: string): Promise<void> => {
      await userEvent.click(
        await canvas.findByRole('button', { name: '4 ページ目' }),
      )
      await waitFor(async () => {
        await expect(router.push).toHaveBeenLastCalledWith(to, {
          scroll: false,
        })
      })
    }

    await choose('並び替え', '番組名順')

    await waitFor(async () => {
      await expect(router.replace).toHaveBeenLastCalledWith(
        `${asked}&sort=name.asc`,
        { scroll: false },
      )
    })

    await walkOut(`${asked}&sort=name.asc&page=4`)

    await choose('表示件数', '50 件ずつ')

    await waitFor(async () => {
      await expect(router.replace).toHaveBeenLastCalledWith(
        `${asked}&sort=name.asc&per_page=50`,
        { scroll: false },
      )
    })

    await walkOut(`${asked}&sort=name.asc&per_page=50&page=4`)

    await userEvent.type(words(canvas), 'の夏{enter}')

    await waitFor(async () => {
      await expect(router.push).toHaveBeenLastCalledWith(
        `${asking}&sort=name.asc&per_page=50`,
        { scroll: false },
      )
    })
  },
}

export const 種別を戻すとチャンネルも戻る: Story = {
  args: {
    result: {
      condition: emptyCondition,
      channels,
      outcome: { state: 'idle' },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await choose('種別', 'BS')

    const none = await openPanel(canvas, 'チャンネル')

    await expect(within(none).queryAllByRole('button')).toHaveLength(0)
    await closePanel()

    await choose('種別', 'すべて')

    const every = await openPanel(canvas, 'チャンネル')

    await press(every, '中央テレビ1')

    await expect(
      within(every).getByRole('button', { name: '中央テレビ1' }),
    ).toHaveAttribute('aria-pressed', 'true')
  },
}

export const 条件を消すと入力欄も空になる: Story = {
  args: {
    result: {
      condition: { ...emptyCondition, genres: ['news'] },
      channels,
      outcome: searched({
        hits: SEARCH_HIT_FIXTURES.slice(0, 4),
        total: 4,
        page: 1,
        lastPage: 1,
        perPage: 20,
        rangeFrom: 1,
        rangeTo: 4,
      }),
    },
  },
  render: (args) => <Live {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const router = getRouter()

    await userEvent.type(words(canvas), '夏 絶景')
    await userEvent.click(canvas.getByRole('button', { name: '条件を解除' }))

    await waitFor(async () => {
      await expect(words(canvas)).toHaveValue('')
    })

    await expect(chipOf(canvas, 'ジャンル')).toHaveTextContent('ジャンルすべて')
    await expect(router.replace).toHaveBeenLastCalledWith('/search', {
      scroll: false,
    })
    await expect(canvas.getByText('まだ検索結果がありません')).toBeVisible()
    await expect(canvas.queryByText('検索結果')).toBeNull()
  },
}

export const 探す場所だけでは条件に数えない: Story = {
  args: {
    result: {
      condition: emptyCondition,
      channels,
      outcome: { state: 'idle' },
    },
  },
  render: (args) => <Live {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await choose('対象範囲', '番組名だけ')

    await waitFor(async () => {
      await expect(
        canvas.getByRole('button', { name: '条件を解除' }),
      ).toBeVisible()
    })
    await standsOnAGround(canvas.getByRole('button', { name: '条件を解除' }))

    await expect(
      canvas.getByRole('button', { name: 'この条件でルールを作成' }),
    ).toBeDisabled()
    await expect(canvas.getByText('まだ検索結果がありません')).toBeVisible()
  },
}

export const チャンネルは上限で足せなくなる: Story = {
  args: {
    result: {
      condition: {
        ...emptyCondition,
        channels: manyChannels
          .slice(0, SEARCH_MOST_CHANNELS)
          .map((channel) => channel.id),
      },
      channels: manyChannels,
      outcome: { state: 'idle' },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const panel = await openPanel(canvas, 'チャンネル')

    await expect(within(panel).getByText(/局まで指定できます/)).toBeVisible()
    await expect(
      within(panel)
        .getAllByRole('button')
        .filter((one) => one.getAttribute('aria-pressed') === 'true'),
    ).toHaveLength(SEARCH_MOST_CHANNELS)
    await expect(
      within(panel)
        .getAllByRole('button')
        .filter((one) => one.hasAttribute('disabled')),
    ).toHaveLength(4)
  },
}

const aPageOfFifty: SearchResult = {
  condition: { ...condition, perPage: 50 },
  channels,
  outcome: searched({
    hits: MORE_HITS_THAN_FIT,
    total: 67,
    page: 1,
    lastPage: 2,
    perPage: 50,
    rangeFrom: 1,
    rangeTo: 50,
  }),
}

async function hitsStayInTheWindow(canvasElement: HTMLElement): Promise<void> {
  const hits = canvasElement.querySelector<HTMLElement>(
    '[data-slot="search-hits"]',
  )!

  await expect(hits.querySelectorAll('li[data-programme]')).toHaveLength(
    MORE_HITS_THAN_FIT.length,
  )
  await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
    window.innerWidth,
  )

  for (const pill of hits.querySelectorAll<HTMLElement>(
    '[data-slot="reserve-pill"]',
  )) {
    await expect(pill.getBoundingClientRect().right).toBeLessThanOrEqual(
      window.innerWidth,
    )
  }
}

export const 収まらないほどの検索結果: Story = {
  args: { result: aPageOfFifty },
  play: async ({ canvasElement }) => {
    await hitsStayInTheWindow(canvasElement)
  },
}

export const 狭い幅で収まらないほどの検索結果: Story = {
  args: { result: aPageOfFifty },
  parameters: { screen: { width: 768, height: 1024 } },
  play: async ({ canvasElement }) => {
    await hitsStayInTheWindow(canvasElement)

    const [first] = MORE_HITS_THAN_FIT
    const row = canvasElement.querySelector<HTMLElement>(
      `[data-slot="search-hits"] [data-programme="${first.id}"]`,
    )!

    await expect(row).toHaveTextContent(first.channelName)
  },
}

export const 電話の幅では結果を番組表の行に組む: Story = {
  args: 検索結果.args,
  parameters: { screen: PHONE },
  play: async ({ canvasElement }) => {
    const hits = await waitFor(() => {
      const found = canvasElement.querySelector<HTMLElement>(
        '[data-slot="phone-search-hits"]',
      )

      expect(found).not.toBeNull()

      return found!
    })

    await expect(
      canvasElement.querySelector('[data-slot="search-hits"]'),
    ).not.toBeVisible()

    const [first] = SEARCH_HIT_FIXTURES
    const row = hits.querySelector<HTMLElement>(
      `[data-programme="${first.id}"]`,
    )!

    await expect(row).toHaveTextContent(first.title)
    await expect(row).toHaveTextContent(first.channelName)
    await expect(row).toHaveTextContent(first.startLabel)
  },
}

export const 幅600pxからは結果を行で並べる: Story = {
  name: '幅600pxからは結果を行で並べる',
  args: 検索結果.args,
  parameters: { screen: FROM_600 },
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector('[data-slot="search-hits"]'),
    ).toBeVisible()
    await expect(
      canvasElement.querySelector('[data-slot="phone-search-hits"]'),
    ).toBeNull()
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      window.innerWidth,
    )
  },
}

const UPRIGHT = { width: 390, height: 844 }

const searchedOnAPhone: SearchResult = {
  condition,
  channels,
  outcome: searched({
    hits: SEARCH_HIT_FIXTURES,
    total: SEARCH_HIT_FIXTURES.length,
    page: 1,
    lastPage: 1,
    perPage: 20,
    rangeFrom: 1,
    rangeTo: SEARCH_HIT_FIXTURES.length,
  }),
}

export const 電話では上の帯が検索の欄で結果を番組表の行で並べる: Story = {
  args: { result: searchedOnAPhone },
  parameters: { screen: UPRIGHT },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const bar = within(
      canvasElement.querySelector<HTMLElement>('[data-slot="top-bar"]')!,
    )
    const field = bar.getByRole('searchbox', { name: 'キーワード' })

    await expect(field).toHaveValue('観測所')
    await expect(bar.getByRole('link', { name: '番組表へ' })).toHaveAttribute(
      'href',
      '/guide',
    )

    const conditions = canvas.getByRole('list', { name: '検索条件' })

    await expect(conditions.getBoundingClientRect().right).toBeLessThanOrEqual(
      window.innerWidth,
    )

    const hits = canvasElement.querySelector<HTMLElement>(
      '[data-slot="phone-search-hits"]',
    )!

    await expect(hits).toBeVisible()
    await expect(hits.querySelector('mark')).toHaveTextContent('観測所')
    await expect(hits.getBoundingClientRect().width).toBe(window.innerWidth)

    const circle = hits.querySelector<HTMLElement>(
      '[data-slot="reserve-circle"][data-mark="none"]',
    )!

    await userEvent.click(circle)
    await waitFor(() => expect(reservedHere).toHaveLength(1))

    const genre = within(conditions).getByRole('button', {
      name: /^ジャンル /,
    })

    await expect(genre.offsetHeight).toBeGreaterThanOrEqual(40)
    await userEvent.click(genre)
    await expect(genre).toHaveAttribute('aria-expanded', 'true')

    const panel = await screen.findByRole('dialog', { name: 'ジャンル' })

    await expect(panel.getBoundingClientRect().right).toBeLessThanOrEqual(
      window.innerWidth,
    )
    await expect(
      within(panel).getByRole('combobox', { name: 'サブジャンルを追加' }),
    ).toBeVisible()
  },
}

export const 横向きの電話は結果と詳細を左右に置き条件の札を上の帯に並べる: Story =
  {
    args: 検索結果.args,
    parameters: { screen: { width: 844, height: 390 }, coarse: true },
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement)
      const bar = canvasElement.querySelector<HTMLElement>(
        '[data-slot="top-bar"]',
      )!

      await expect(
        within(bar).getByRole('searchbox', { name: 'キーワード' }),
      ).toBeVisible()
      await expect(
        within(bar).getByRole('list', { name: '検索条件' }),
      ).toBeVisible()

      const beside = await canvas.findByRole('region', { name: '番組の詳細' })
      const list =
        canvasElement.querySelector<HTMLElement>('[data-pane="list"]')!
      const rows = list.querySelectorAll<HTMLElement>('li[data-programme]')

      await expect(rows[0]).toHaveAttribute('data-chosen')
      await expect(
        within(beside).getAllByRole('heading', { level: 2 })[0],
      ).toHaveTextContent(SEARCH_HIT_FIXTURES[0].title)

      await userEvent.click(within(rows[1]).getAllByRole('button')[0])
      await waitFor(() => expect(rows[1]).toHaveAttribute('data-chosen'))
      await expect(
        within(beside).getAllByRole('heading', { level: 2 })[0],
      ).toHaveTextContent(SEARCH_HIT_FIXTURES[1].title)
      await expect(
        canvasElement.querySelector('[data-slot="search-hits"]'),
      ).not.toBeVisible()
    },
  }

const watchIt = fn(
  async (_programmeId: string, draft: WatchDraft): Promise<WatchWrite> => ({
    state: 'ok',
    watch: { id: 'watch-asked', leadMinutes: draft.leadMinutes },
  }),
)

const unwatchIt = fn(async (_watchId: string): Promise<NotificationWrite> => ({
  state: 'ok',
}))

const NOTICING: Noticing = {
  offer: {
    leadMinutes: 3,
    destinations: [
      { id: 'dest-slack', name: '家の Slack' },
      { id: 'dest-ipad', name: 'iPad の Safari' },
    ],
  },
  onWatch: watchIt,
  onUnwatch: unwatchIt,
}

const CINEMA_AHEAD: SearchHit = { ...SEARCH_HIT_FIXTURES[1], ahead: true }

const AQUARIUM_TOLD: SearchHit = {
  ...SEARCH_HIT_FIXTURES[2],
  ahead: true,
  watch: { id: 'watch-told', leadMinutes: 10 },
}

const STARTED: SearchHit = {
  ...SEARCH_HIT_FIXTURES[1],
  id: '131-1310-40011',
  title: '夕方の灯台だより',
  startLabel: '17:00',
  endLabel: '17:30',
}

/** The detail beside the list once the row at a place in it is chosen. */
async function besideTheRow(
  canvasElement: HTMLElement,
  at: number,
): Promise<HTMLElement> {
  const beside = await within(canvasElement).findByRole('region', {
    name: '番組の詳細',
  })
  const rows = canvasElement.querySelectorAll<HTMLElement>(
    '[data-pane="list"] li[data-programme]',
  )

  await userEvent.click(within(rows[at]).getAllByRole('button')[0])
  await waitFor(() => expect(rows[at]).toHaveAttribute('data-chosen'))

  return beside
}

export const 横向きの電話の詳細でも録画予約の隣で放送開始の通知を頼む: Story = {
  args: {
    result: {
      condition,
      channels,
      outcome: searched({
        hits: [STARTED, CINEMA_AHEAD, AQUARIUM_TOLD],
        total: 3,
        page: 1,
        lastPage: 1,
        perPage: 20,
        rangeFrom: 1,
        rangeTo: 3,
      }),
    },
    noticing: NOTICING,
  },
  parameters: { screen: { width: 844, height: 390 }, coarse: true },
  beforeEach: () => {
    watchIt.mockClear()
    unwatchIt.mockClear()
  },
  play: async ({ canvasElement }) => {
    const first = within(await besideTheRow(canvasElement, 1))
    const reserve = first.getByRole('button', { name: '録画予約' })
    const ask = first.getByRole('button', { name: NOTIFY_START })

    await expect(Math.round(ask.getBoundingClientRect().top)).toBe(
      Math.round(reserve.getBoundingClientRect().top),
    )
    await expect(ask.getBoundingClientRect().left).toBeGreaterThan(
      reserve.getBoundingClientRect().right,
    )
    await expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBe(
      844,
    )
    await userEvent.click(ask)

    const form = within(
      await screen.findByRole('dialog', { name: NOTIFY_START }),
    )

    await userEvent.click(form.getByRole('button', { name: '通知する' }))
    await waitFor(() =>
      expect(watchIt).toHaveBeenCalledWith(CINEMA_AHEAD.id, {
        leadMinutes: 3,
        destinations: ['dest-slack', 'dest-ipad'],
      }),
    )
    await expect(
      await screen.findByText('開始の 3 分前に通知します'),
    ).toBeVisible()

    const told = within(await besideTheRow(canvasElement, 2))

    await expect(told.getByText('開始 10 分前に通知')).toBeVisible()
    await expect(told.queryByRole('button', { name: NOTIFY_START })).toBeNull()
    await userEvent.click(told.getByRole('button', { name: STOP_NOTIFYING }))
    await waitFor(() => expect(unwatchIt).toHaveBeenCalledWith('watch-told'))

    const started = within(await besideTheRow(canvasElement, 0))

    await expect(
      started.getByRole('button', { name: '録画予約' }),
    ).toBeVisible()
    await expect(
      started.queryByRole('button', { name: NOTIFY_START }),
    ).toBeNull()
  },
}
