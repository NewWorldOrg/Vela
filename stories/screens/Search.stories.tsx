import type { CSSProperties } from 'react'
import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'
import { getRouter } from '@storybook/nextjs/navigation.mock'
import {
  expect,
  fireEvent,
  screen,
  userEvent,
  waitFor,
  within,
} from 'storybook/test'

import type { SearchCondition, SearchResult } from '@/repository/search'
import type { GuideChannel } from '@/repository/programs'
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
import { SearchView } from '@/components/search/search-page'
import { afterTheArrival } from '@/stories/after-the-arrival'
import { scrollsInsideWithItsHeaderHeld } from '@/stories/scrolls-inside'
import { inTheApp } from '@/stories/frames'
import { FROM_600, laysRowsAsATable, PHONE } from '@/stories/rows-as-cards'

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

function picked(canvasElement: HTMLElement, kind: string): string[] {
  return within(canvasElement)
    .queryAllByRole('button', { name: new RegExp(`^${kind} .+ を外す$`) })
    .map((one) => one.getAttribute('aria-label') ?? '')
}

function fillDate(field: HTMLElement, date: string): void {
  fireEvent.change(field, { target: { value: date } })
}

const meta = {
  title: 'Screens/番組検索',
  component: SearchView,
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true, navigation: { pathname: '/search' } },
  },
  decorators: [inTheApp],
} satisfies Meta<typeof SearchView>

export default meta
type Story = StoryObj<typeof meta>

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
    await expect(
      canvas.getByRole('button', { name: 'この条件でルールを作成' }),
    ).toBeDisabled()
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
      outcome: {
        state: 'searched',
        found: {
          hits: SEARCH_HIT_FIXTURES.slice(0, 4),
          total: 4,
          page: 1,
          lastPage: 1,
          perPage: 20,
          rangeFrom: 1,
          rangeTo: 4,
        },
      },
    },
  },
}

export const 条件をすべて指定: Story = {
  args: {
    result: {
      condition: everyCondition,
      channels,
      outcome: {
        state: 'searched',
        found: {
          hits: SEARCH_HIT_FIXTURES.slice(0, 6),
          total: 6,
          page: 1,
          lastPage: 1,
          perPage: 20,
          rangeFrom: 1,
          rangeTo: 6,
        },
      },
    },
  },
}

export const 検索結果: Story = {
  args: {
    result: {
      condition,
      channels,
      outcome: {
        state: 'searched',
        found: {
          hits: SEARCH_HIT_FIXTURES,
          total: 67,
          page: 1,
          lastPage: 4,
          perPage: 20,
          rangeFrom: 1,
          rangeTo: 20,
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('heading', { name: '検索結果' }),
    ).toBeVisible()
    await expect(canvas.getAllByRole('row')).toHaveLength(
      SEARCH_HIT_FIXTURES.length + 1,
    )
    await expect(
      canvas.getByRole('link', { name: SEARCH_HIT_FIXTURES[0].title }),
    ).toBeVisible()
    await saysNothingItCannotKeep(canvas)
  },
}

export const ページ送り: Story = {
  args: {
    result: {
      condition: { ...condition, page: 3 },
      channels,
      outcome: {
        state: 'searched',
        found: {
          hits: SEARCH_HIT_FIXTURES,
          total: 67,
          page: 3,
          lastPage: 4,
          perPage: 20,
          rangeFrom: 41,
          rangeTo: 60,
        },
      },
    },
  },
}

export const 該当なし: Story = {
  args: {
    result: {
      condition: { ...emptyCondition, q: '見つからない語', exclude: '再放送' },
      channels,
      outcome: {
        state: 'searched',
        found: {
          hits: [],
          total: 0,
          page: 1,
          lastPage: 1,
          perPage: 20,
          rangeFrom: 0,
          rangeTo: 0,
        },
      },
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

    await choose('ジャンルを追加', 'ニュース/報道')

    await waitFor(async () => {
      await expect(
        canvas.getByRole('button', { name: 'ジャンル ニュース/報道 を外す' }),
      ).toBeVisible()
    })

    await choose('ジャンルを追加', 'ドキュメンタリー/教養')

    await waitFor(async () => {
      await expect(
        canvas.getByRole('button', {
          name: 'ジャンル ドキュメンタリー/教養 を外す',
        }),
      ).toBeVisible()
    })

    await expect(
      canvas
        .getAllByRole('button', { name: /^ジャンル .+ を外す$/ })
        .map((one) => one.getAttribute('aria-label')),
    ).toEqual([
      'ジャンル ニュース/報道 を外す',
      'ジャンル ドキュメンタリー/教養 を外す',
    ])

    await expect(
      canvas.getByRole('combobox', { name: 'ジャンルを追加' }),
    ).toHaveTextContent('＋ ジャンルを追加')

    await expect(canvas.getByText('1 件の条件を指定しています')).toBeVisible()
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

    await userEvent.click(
      canvas.getByRole('button', { name: 'ジャンル ニュース/報道 を外す' }),
    )

    await waitFor(async () => {
      await expect(
        canvas.queryByRole('button', { name: 'ジャンル ニュース/報道 を外す' }),
      ).toBeNull()
    })

    await expect(
      canvas.getByRole('button', {
        name: 'ジャンル ドキュメンタリー/教養 を外す',
      }),
    ).toBeVisible()

    await choose('ジャンルを追加', 'ニュース/報道')

    await waitFor(async () => {
      await expect(
        canvas.getByRole('button', { name: 'ジャンル ニュース/報道 を外す' }),
      ).toBeVisible()
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

    await userEvent.type(
      canvas.getByRole('textbox', { name: 'キーワード' }),
      '夏 絶景',
    )
    await userEvent.click(canvas.getByRole('button', { name: '検索' }))

    await waitFor(async () => {
      await expect(router.push).toHaveBeenLastCalledWith(
        '/search?q=%E5%A4%8F+%E7%B5%B6%E6%99%AF&genre=news',
        { scroll: false },
      )
    })
  },
}

export const 条件は押すまで走らず押すとまとめて走る: Story = {
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

    await userEvent.type(
      canvas.getByRole('textbox', { name: 'キーワード' }),
      ' 夏 絶景 ',
    )
    await stillNothingAskedFor('キーワード')

    await userEvent.type(
      canvas.getByRole('textbox', { name: '除外キーワード' }),
      ' 再放送 ',
    )
    await stillNothingAskedFor('除外キーワード')

    await choose('対象範囲', '番組名だけ')
    await stillNothingAskedFor('対象範囲')

    await choose('ジャンルを追加', '映画')
    await stillNothingAskedFor('ジャンル')

    await choose('種別', '地上波')
    await stillNothingAskedFor('種別')

    await choose('チャンネルを追加', '中央テレビ1')
    await stillNothingAskedFor('チャンネル')

    fillDate(canvas.getByLabelText('期間の開始日'), '2026-08-09')
    await stillNothingAskedFor('期間の開始日')

    fillDate(canvas.getByLabelText('期間の終了日'), '2026-08-15')
    await stillNothingAskedFor('期間の終了日')

    await userEvent.click(canvas.getByRole('button', { name: '検索' }))

    await waitFor(async () => {
      await expect(router.push).toHaveBeenLastCalledWith(
        '/search?q=%E5%A4%8F+%E7%B5%B6%E6%99%AF&exclude=%E5%86%8D%E6%94%BE%E9%80%81' +
          '&fields=title&genre=movie&type=terrestrial&channel=131-1310' +
          '&from=2026-08-09&to=2026-08-15',
        { scroll: false },
      )
    })

    await expect(router.push).toHaveBeenCalledTimes(1)
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

    await userEvent.type(
      canvas.getByRole('textbox', { name: 'キーワード' }),
      '夏{enter}',
    )

    await waitFor(async () => {
      await expect(router.push).toHaveBeenLastCalledWith(
        '/search?q=%E5%A4%8F',
        {
          scroll: false,
        },
      )
    })

    await userEvent.type(
      canvas.getByRole('textbox', { name: '除外キーワード' }),
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
    const field = canvas.getByRole('textbox', { name: 'キーワード' })

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
  args: {
    result: {
      condition,
      channels,
      outcome: {
        state: 'searched',
        found: {
          hits: SEARCH_HIT_FIXTURES,
          total: 67,
          page: 1,
          lastPage: 4,
          perPage: 20,
          rangeFrom: 1,
          rangeTo: 20,
        },
      },
    },
  },
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
  args: {
    result: {
      condition,
      channels,
      outcome: {
        state: 'searched',
        found: {
          hits: SEARCH_HIT_FIXTURES,
          total: 67,
          page: 1,
          lastPage: 4,
          perPage: 20,
          rangeFrom: 1,
          rangeTo: 20,
        },
      },
    },
  },
  render: (args) => <Live {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const router = getRouter()

    await userEvent.type(
      canvas.getByRole('textbox', { name: 'キーワード' }),
      'の夏',
    )

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

    await expect(
      canvas.getByRole('textbox', { name: 'キーワード' }),
    ).toHaveValue('観測所の夏')
    await expect(
      canvas.getByText(
        '/search?q=観測所の夏&from=2026-08-09&to=2026-08-15&sort=name.asc',
      ),
    ).toBeVisible()
    await expect(router.push).not.toHaveBeenCalled()
  },
}

export const 数と行き先は押す前から手元の条件を映す: Story = {
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

    await expect(canvas.getByText('/search')).toBeVisible()
    await expect(canvas.queryByText(/件の条件を指定しています/)).toBeNull()

    await expect(
      canvas.queryByRole('link', { name: 'この条件でルールを作成' }),
    ).toBeNull()
    await expect(
      canvas.getByRole('button', { name: 'この条件でルールを作成' }),
    ).toBeDisabled()

    await userEvent.type(
      canvas.getByRole('textbox', { name: 'キーワード' }),
      '夏 絶景',
    )

    await waitFor(async () => {
      await expect(canvas.getByText('1 件の条件を指定しています')).toBeVisible()
    })
    await expect(canvas.getByText('/search?q=夏+絶景')).toBeVisible()

    await choose('ジャンルを追加', '映画')

    await waitFor(async () => {
      await expect(canvas.getByText('2 件の条件を指定しています')).toBeVisible()
    })
    await expect(
      canvas.getByText('/search?q=夏+絶景&genre=movie'),
    ).toBeVisible()

    await expect(
      canvas.getByRole('link', { name: 'この条件でルールを作成' }),
    ).toHaveAttribute(
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

    await choose('曜日を追加', '水曜')
    await choose('曜日を追加', '月曜')

    await waitFor(async () => {
      await expect(picked(canvasElement, '曜日')).toEqual([
        '曜日 月曜 を外す',
        '曜日 水曜 を外す',
      ])
    })

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

    await waitFor(async () => {
      await expect(picked(canvasElement, 'サブジャンル')).toEqual([
        'サブジャンル 海外ドラマ(ドラマ) を外す',
      ])
    })

    await expect(canvas.getByText('3 件の条件を指定しています')).toBeVisible()
    await expect(
      canvas.getByText(
        '/search?genre=anime&subgenre=3-1&day=monday&day=wednesday',
      ),
    ).toBeVisible()
    await expect(
      canvas.getByRole('link', { name: 'この条件でルールを作成' }),
    ).toHaveAttribute(
      'href',
      '/reservations/rules?rule=new&genre=anime&subgenre=3-1&day=monday&day=wednesday',
    )
    await expect(router.push).not.toHaveBeenCalled()

    await userEvent.click(canvas.getByRole('button', { name: '検索' }))

    await waitFor(async () => {
      await expect(router.push).toHaveBeenLastCalledWith(
        '/search?genre=anime&subgenre=3-1&day=monday&day=wednesday',
        { scroll: false },
      )
    })
    await expect(picked(canvasElement, '曜日')).toEqual([
      '曜日 月曜 を外す',
      '曜日 水曜 を外す',
    ])
    await expect(picked(canvasElement, 'サブジャンル')).toEqual([
      'サブジャンル 海外ドラマ(ドラマ) を外す',
    ])
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
  render: (args) => <Live {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await choose('曜日を追加', '金曜')

    await waitFor(async () => {
      await expect(
        canvas.getByRole('link', { name: 'この条件でルールを作成' }),
      ).toHaveAttribute('href', '/reservations/rules?rule=new&day=friday')
    })
    await expect(canvas.getByText('1 件の条件を指定しています')).toBeVisible()

    await userEvent.click(
      canvas.getByRole('button', { name: '曜日 金曜 を外す' }),
    )
    await choose('サブジャンルを追加', '国内アニメ')

    await waitFor(async () => {
      await expect(
        canvas.getByRole('link', { name: 'この条件でルールを作成' }),
      ).toHaveAttribute('href', '/reservations/rules?rule=new&subgenre=7-0')
    })
    await expect(canvas.getByText('1 件の条件を指定しています')).toBeVisible()
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
  render: (args) => <Live {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('1 件の条件を指定しています')).toBeVisible()

    await choose('曜日を追加', '日曜')

    await waitFor(async () => {
      await expect(picked(canvasElement, '曜日')).toHaveLength(7)
    })
    await expect(
      canvas.queryByRole('combobox', { name: '曜日を追加' }),
    ).toBeNull()
    await expect(canvas.queryByText(/件の条件を指定しています/)).toBeNull()
    await expect(
      canvas.getByRole('button', { name: 'この条件でルールを作成' }),
    ).toBeDisabled()
  },
}

export const 開いた住所の条件が欄に入っている: Story = {
  args: {
    result: {
      condition: everyCondition,
      channels,
      outcome: {
        state: 'searched',
        found: {
          hits: SEARCH_HIT_FIXTURES.slice(0, 6),
          total: 6,
          page: 1,
          lastPage: 1,
          perPage: 20,
          rangeFrom: 1,
          rangeTo: 6,
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('textbox', { name: 'キーワード' }),
    ).toHaveValue('夏 絶景')
    await expect(
      canvas.getByRole('textbox', { name: '除外キーワード' }),
    ).toHaveValue('再放送')
    await expect(
      canvas.getByRole('combobox', { name: '対象範囲' }),
    ).toHaveTextContent('番組名だけ')
    await expect(
      canvas.getByRole('combobox', { name: '種別' }),
    ).toHaveTextContent('地上波')
    await expect(
      canvas
        .getAllByRole('button', { name: /^ジャンル .+ を外す$/ })
        .map((one) => one.getAttribute('aria-label')),
    ).toEqual(['ジャンル ドキュメンタリー/教養 を外す', 'ジャンル 映画 を外す'])
    await expect(picked(canvasElement, 'サブジャンル')).toEqual([
      'サブジャンル 国内アニメ(アニメ/特撮) を外す',
    ])
    await expect(
      canvas.getAllByRole('button', { name: /^チャンネル .+ を外す$/ }),
    ).toHaveLength(3)
    await expect(picked(canvasElement, '曜日')).toEqual([
      '曜日 土曜 を外す',
      '曜日 日曜 を外す',
    ])
    await expect(canvas.getByLabelText('期間の開始日')).toHaveValue(
      '2026-08-09',
    )
    await expect(canvas.getByLabelText('期間の終了日')).toHaveValue(
      '2026-08-15',
    )
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

    await userEvent.type(
      canvas.getByRole('textbox', { name: 'キーワード' }),
      '夏 絶景',
    )
    await userEvent.click(canvas.getByRole('button', { name: '検索' }))

    await waitFor(async () => {
      await expect(canvas.getByText('/search?q=夏+絶景')).toBeVisible()
    })

    await userEvent.click(
      canvas.getByRole('button', { name: 'ブラウザの戻る' }),
    )

    await waitFor(async () => {
      await expect(
        canvas.getByRole('textbox', { name: 'キーワード' }),
      ).toHaveValue('')
    })
    await expect(canvas.getByText('まだ検索結果がありません')).toBeVisible()

    await userEvent.click(
      canvas.getByRole('button', { name: 'ブラウザの進む' }),
    )

    await waitFor(async () => {
      await expect(
        canvas.getByRole('textbox', { name: 'キーワード' }),
      ).toHaveValue('夏 絶景')
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
  render: (args) => <Live {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.type(
      canvas.getByRole('textbox', { name: 'キーワード' }),
      '夏 絶景',
    )
    await choose('ジャンルを追加', '映画')

    await userEvent.click(canvas.getByRole('button', { name: '条件を解除' }))

    await waitFor(async () => {
      await expect(
        canvas.getByRole('textbox', { name: 'キーワード' }),
      ).toHaveValue('')
    })
    await expect(
      canvas.queryByRole('button', { name: /ジャンル .+ を外す/ }),
    ).toBeNull()
  },
}

export const 頼み直すと最初のページから: Story = {
  args: {
    result: {
      condition: { ...condition, page: 3 },
      channels,
      outcome: {
        state: 'searched',
        found: {
          hits: SEARCH_HIT_FIXTURES,
          total: 67,
          page: 3,
          lastPage: 4,
          perPage: 20,
          rangeFrom: 41,
          rangeTo: 60,
        },
      },
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

    await userEvent.type(
      canvas.getByRole('textbox', { name: 'キーワード' }),
      'の夏',
    )
    await userEvent.click(canvas.getByRole('button', { name: '検索' }))

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

    await waitFor(async () => {
      await expect(
        canvas.queryByRole('combobox', { name: 'チャンネルを追加' }),
      ).toBeNull()
    })

    await choose('種別', 'すべて')

    await waitFor(async () => {
      await expect(
        canvas.getByRole('combobox', { name: 'チャンネルを追加' }),
      ).toBeVisible()
    })

    await choose('チャンネルを追加', '中央テレビ1')

    await expect(
      canvas.getByRole('button', { name: 'チャンネル 中央テレビ1 を外す' }),
    ).toBeVisible()
  },
}

export const 条件を消すと入力欄も空になる: Story = {
  args: {
    result: {
      condition: { ...emptyCondition, genres: ['news'] },
      channels,
      outcome: {
        state: 'searched',
        found: {
          hits: SEARCH_HIT_FIXTURES.slice(0, 4),
          total: 4,
          page: 1,
          lastPage: 1,
          perPage: 20,
          rangeFrom: 1,
          rangeTo: 4,
        },
      },
    },
  },
  render: (args) => <Live {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const router = getRouter()

    await userEvent.type(
      canvas.getByRole('textbox', { name: 'キーワード' }),
      '夏 絶景',
    )
    await userEvent.click(canvas.getByRole('button', { name: '条件を解除' }))

    await waitFor(async () => {
      await expect(
        canvas.getByRole('textbox', { name: 'キーワード' }),
      ).toHaveValue('')
    })

    await expect(
      canvas.queryByRole('button', { name: /ジャンル .+ を外す/ }),
    ).toBeNull()

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

    await expect(canvas.queryByText(/件の条件を指定しています/)).toBeNull()
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

    await expect(
      canvas.queryByRole('combobox', { name: 'チャンネルを追加' }),
    ).toBeNull()

    await expect(canvas.getByText(/局まで指定できます/)).toBeVisible()

    await expect(
      canvas.getAllByRole('button', { name: /^チャンネル .+ を外す$/ }),
    ).toHaveLength(SEARCH_MOST_CHANNELS)
  },
}

const aPageOfFifty: SearchResult = {
  condition: { ...condition, perPage: 50 },
  channels,
  outcome: {
    state: 'searched',
    found: {
      hits: MORE_HITS_THAN_FIT,
      total: 67,
      page: 1,
      lastPage: 2,
      perPage: 50,
      rangeFrom: 1,
      rangeTo: 50,
    },
  },
}

export const 収まらないほどの検索結果: Story = {
  args: { result: aPageOfFifty },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, 'チャンネル')
  },
}

export const 狭い幅で収まらないほどの検索結果: Story = {
  args: { result: aPageOfFifty },
  parameters: { screen: { width: 768, height: 1024 } },
  play: async ({ canvasElement }) => {
    await scrollsInsideWithItsHeaderHeld(canvasElement, 'チャンネル')
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
      canvasElement.querySelector('[data-slot="table-container"]'),
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

export const 幅600pxからは結果を表のまま: Story = {
  args: 検索結果.args,
  parameters: { screen: FROM_600 },
  play: async ({ canvasElement }) => {
    await laysRowsAsATable(canvasElement)
  },
}

const UPRIGHT = { width: 390, height: 844 }

const searchedOnAPhone: SearchResult = {
  condition,
  channels,
  outcome: {
    state: 'searched',
    found: {
      hits: SEARCH_HIT_FIXTURES,
      total: SEARCH_HIT_FIXTURES.length,
      page: 1,
      lastPage: 1,
      perPage: 20,
      rangeFrom: 1,
      rangeTo: SEARCH_HIT_FIXTURES.length,
    },
  },
}

const reservedHere: string[] = []

export const 電話では上の帯が検索の欄で結果を番組表の行で並べる: Story = {
  args: {
    result: searchedOnAPhone,
    onReserve: async (programmeId: string) => {
      reservedHere.push(programmeId)

      return { state: 'ok' as const, reservationId: 'r-1' }
    },
    onCancel: async () => ({ state: 'ok' as const }),
  },
  parameters: { screen: UPRIGHT },
  beforeEach: () => {
    reservedHere.length = 0
  },
  play: async ({ canvasElement }) => {
    const bar = within(
      canvasElement.querySelector<HTMLElement>('[data-slot="top-bar"]')!,
    )
    const field = bar.getByRole('searchbox', { name: 'キーワード' })

    await expect(field).toHaveValue('観測所')
    await expect(bar.getByRole('link', { name: '番組表へ' })).toHaveAttribute(
      'href',
      '/guide',
    )

    const chips = within(
      canvasElement.querySelector<HTMLElement>(
        '[data-slot="phone-conditions"]',
      )!,
    ).getAllByRole('button')

    await expect(chips).toHaveLength(5)

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

    await userEvent.click(chips[1])
    await expect(chips[1]).toHaveAttribute('aria-expanded', 'true')
    await expect(
      within(canvasElement).getByRole('combobox', { name: 'ジャンルを追加' }),
    ).toBeVisible()
    await expect(
      within(canvasElement).queryByRole('combobox', { name: '種別' }),
    ).toBeNull()
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
      await expect(canvasElement.querySelector('table')).not.toBeVisible()
    },
  }
