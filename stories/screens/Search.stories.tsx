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
  searchConditionOfQuery,
} from '@/repository/search-options'
import {
  SEARCH_CHANNEL_FIXTURES,
  SEARCH_HIT_FIXTURES,
} from '@/repository/search.fixtures'
import { SearchView } from '@/components/search/search-page'

const emptyCondition: SearchCondition = {
  fields: 'title,description',
  genres: [],
  channels: [],
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
  kind: 'terrestrial',
  channels: [
    SEARCH_CHANNEL_FIXTURES[0].id,
    SEARCH_CHANNEL_FIXTURES[1].id,
    SEARCH_CHANNEL_FIXTURES[2].id,
  ],
}

const channels = SEARCH_CHANNEL_FIXTURES

/**
 * More channels than the store will take, so the ceiling can be stood on. A
 * full scan of terrestrial, BS and CS110 reaches this in real houses.
 */
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

/**
 * The part the server plays. The address is the state: what the screen writes
 * there comes back to it as the condition of the next render, so a story that
 * does not answer the navigation cannot be asked what a second choice does —
 * the second choice would be drawn from the args, and the question could not
 * fail.
 */
function Live({ result }: { result: SearchResult }) {
  const [condition, setCondition] = useState<SearchCondition>(result.condition)

  getRouter().push.mockImplementation((href: string) => {
    setCondition(arriveAt(href))
  })
  getRouter().replace.mockImplementation((href: string) => {
    setCondition(arriveAt(href))
  })

  return <SearchView result={{ ...result, condition }} />
}

/**
 * The part the browser plays, for the two buttons no screen draws. Asking is
 * somewhere the reader has been, so it leaves an entry behind; clearing the
 * fields takes the entry they are standing on.
 *
 * The buttons are the story's own furniture and are dressed by hand: they are
 * on the page the probes read, so they carry a press area of their own and
 * their own colours rather than borrowing the screen's.
 */
const BROWSER_BUTTON = {
  minWidth: '48px',
  minHeight: '48px',
  padding: '0 12px',
  background: '#ffffff',
  color: '#111111',
  border: '1px solid #111111',
  borderRadius: '4px',
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
          style={BROWSER_BUTTON}
          disabled={at === 0}
          onClick={() => setAt((standing) => standing - 1)}
        >
          ブラウザの戻る
        </button>
        <button
          type="button"
          style={BROWSER_BUTTON}
          disabled={at === entries.length - 1}
          onClick={() => setAt((standing) => standing + 1)}
        >
          ブラウザの進む
        </button>
      </div>
      <SearchView result={{ ...result, condition: entries[at] }} />
    </>
  )
}

async function choose(list: string, option: string): Promise<void> {
  await userEvent.click(screen.getByRole('combobox', { name: list }))
  await userEvent.click(await screen.findByRole('option', { name: option }))
}

/** A date field takes a date, not a run of letters. */
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
}

export const 条件不備: Story = {
  args: {
    result: {
      condition: { ...emptyCondition, q: 'あ' },
      channels,
      outcome: {
        state: 'refused',
        message:
          'キーワード・除外キーワードは、指定する場合は2文字以上にしてください。期間は開始日から終了日へ向かう最長 31 日の範囲で指定できます。',
      },
    },
  },
}

/**
 * The complaint this screen was rebuilt for: choosing a genre used to look like
 * it had thrown the previous one away. What the list goes back to saying is
 * "＋ ジャンルを足す"; what was already chosen stays beside it, in the order it
 * was chosen.
 */
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

    await choose('ジャンルを足す', 'ニュース/報道')

    await waitFor(async () => {
      await expect(
        canvas.getByRole('button', { name: 'ジャンル ニュース/報道 を外す' }),
      ).toBeVisible()
    })

    await choose('ジャンルを足す', 'ドキュメンタリー/教養')

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
      canvas.getByRole('combobox', { name: 'ジャンルを足す' }),
    ).toHaveTextContent('＋ ジャンルを足す')

    await expect(canvas.getByText('1 件の条件を指定しています')).toBeVisible()
  },
}

/**
 * Taking one back leaves the rest, and the list it came from offers it again.
 */
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

    await choose('ジャンルを足す', 'ニュース/報道')

    await waitFor(async () => {
      await expect(
        canvas.getByRole('button', { name: 'ジャンル ニュース/報道 を外す' }),
      ).toBeVisible()
    })
  },
}

/**
 * A keyword is written into the address beside what was already asked for,
 * never in place of it — the address is the whole condition, every time.
 */
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

/**
 * The complaint this was written for: every condition is assembled in the
 * fields and asked for in one go, so nothing a reader is halfway through
 * saying is confirmed on their behalf.
 *
 * All seven are answered here, one after another, and each of them is asked
 * whether it went off on its own — one story rather than seven so that an
 * implementation which fires on the fourth condition cannot hide behind six
 * that do not. Then 検索, which has to send every one of them: an
 * implementation that has simply stopped searching is not what was asked for
 * either, and this is where that shows.
 */
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

    /** Nothing has been touched, so nothing can have been asked for yet. */
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
      '夏 絶景',
    )
    await stillNothingAskedFor('キーワード')

    await userEvent.type(
      canvas.getByRole('textbox', { name: '除外' }),
      '再放送',
    )
    await stillNothingAskedFor('除外')

    await choose('探す場所', '番組名だけ')
    await stillNothingAskedFor('探す場所')

    await choose('ジャンルを足す', '映画')
    await stillNothingAskedFor('ジャンル')

    await choose('種別', '地上')
    await stillNothingAskedFor('種別')

    await choose('チャンネルを足す', '中央テレビ1')
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

/**
 * Enter in a field is the same act as pressing 検索, and asks for the whole
 * condition rather than for the field it was pressed in.
 */
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
      canvas.getByRole('textbox', { name: '除外' }),
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

/**
 * How the result is arranged is not a condition: it changes nothing about
 * which programmes come back, there is nothing to assemble, and it takes
 * effect where it is chosen. Measured beside the conditions so that an
 * implementation which made everything wait for 検索 is not green either.
 */
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

/**
 * The other half of the same complaint: a reader who only meant to sort the
 * rows in front of them used to confirm whatever was half typed in the fields
 * along with it, and the store answered a question nobody had asked.
 */
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

    /** Still in the field, still unasked. */
    await expect(
      canvas.getByRole('textbox', { name: 'キーワード' }),
    ).toHaveValue('観測所の夏')
    await expect(router.push).not.toHaveBeenCalled()
  },
}

/**
 * What 検索 would do is legible before it is pressed: the count and the line
 * under the fields both follow the fields, not the address, so a reader can
 * see the question they are assembling.
 */
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

    await userEvent.type(
      canvas.getByRole('textbox', { name: 'キーワード' }),
      '夏 絶景',
    )

    await waitFor(async () => {
      await expect(canvas.getByText('1 件の条件を指定しています')).toBeVisible()
    })
    await expect(canvas.getByText('/search?q=夏+絶景')).toBeVisible()

    await choose('ジャンルを足す', '映画')

    await waitFor(async () => {
      await expect(canvas.getByText('2 件の条件を指定しています')).toBeVisible()
    })
    await expect(
      canvas.getByText('/search?q=夏+絶景&genre=movie'),
    ).toBeVisible()

    await expect(router.push).not.toHaveBeenCalled()
    await expect(router.replace).not.toHaveBeenCalled()
  },
}

/**
 * An address opened cold has its conditions in the fields, all seven of them —
 * which is what a link to a search is for.
 */
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
    await expect(canvas.getByRole('textbox', { name: '除外' })).toHaveValue(
      '再放送',
    )
    await expect(
      canvas.getByRole('combobox', { name: '探す場所' }),
    ).toHaveTextContent('番組名だけ')
    await expect(
      canvas.getByRole('combobox', { name: '種別' }),
    ).toHaveTextContent('地上')
    await expect(
      canvas
        .getAllByRole('button', { name: /^ジャンル .+ を外す$/ })
        .map((one) => one.getAttribute('aria-label')),
    ).toEqual(['ジャンル ドキュメンタリー/教養 を外す', 'ジャンル 映画 を外す'])
    await expect(
      canvas.getAllByRole('button', { name: /^チャンネル .+ を外す$/ }),
    ).toHaveLength(3)
    await expect(canvas.getByLabelText('期間の開始日')).toHaveValue(
      '2026-08-09',
    )
    await expect(canvas.getByLabelText('期間の終了日')).toHaveValue(
      '2026-08-15',
    )
  },
}

/**
 * The address is still the state, so the history is still the reader's. Going
 * back to a search brings its conditions back into the fields as well as its
 * result — the fields are seeded from the address rather than kept alongside
 * it, and a screen that kept them alongside would show the question the reader
 * had moved on from.
 */
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
    await expect(canvas.getByText('まだ検索していません')).toBeVisible()

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

/**
 * 種別 narrows what the チャンネル list offers, and widening it back offers
 * the channels the narrower answer left out — which it can only do because the
 * list the screen was handed was never cut down to the 種別 in the address.
 */
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
        canvas.queryByRole('combobox', { name: 'チャンネルを足す' }),
      ).toBeNull()
    })

    await choose('種別', 'すべて')

    await waitFor(async () => {
      await expect(
        canvas.getByRole('combobox', { name: 'チャンネルを足す' }),
      ).toBeVisible()
    })

    await choose('チャンネルを足す', '中央テレビ1')

    await expect(
      canvas.getByRole('button', { name: 'チャンネル 中央テレビ1 を外す' }),
    ).toBeVisible()
  },
}

/**
 * 条件をすべて消す empties the fields as well as the address. The fields are
 * uncontrolled between confirmations, so a keyword that was typed and never
 * confirmed used to survive the clear and be shown against a bare address.
 */
export const 条件をすべて消すと入力欄も空になる: Story = {
  args: {
    result: {
      condition: { ...emptyCondition, genres: ['news'] },
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
    await userEvent.click(
      canvas.getByRole('button', { name: '条件をすべて消す' }),
    )

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

/**
 * 探す場所 says where a keyword is looked for and narrows nothing on its own,
 * so it is not counted as a condition the reader has specified — counting it
 * promised a search that the screen then turned away as asking for nothing.
 * The way back is still offered, because the fields no longer stand at nothing.
 */
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

    await choose('探す場所', '番組名だけ')

    await waitFor(async () => {
      await expect(
        canvas.getByRole('button', { name: '条件をすべて消す' }),
      ).toBeVisible()
    })

    await expect(canvas.queryByText(/件の条件を指定しています/)).toBeNull()
    await expect(canvas.getByText('まだ検索していません')).toBeVisible()
  },
}

/**
 * At the ceiling the store accepts, the screen stops offering more. Going on
 * offering them would write an address the reader then drops the tail of, so
 * the chip for the extra channel would appear and vanish with nothing said.
 */
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
      canvas.queryByRole('combobox', { name: 'チャンネルを足す' }),
    ).toBeNull()

    await expect(
      canvas.getByText(/局まで指定できます。足すには、どれかを外してください/),
    ).toBeVisible()

    await expect(
      canvas.getAllByRole('button', { name: /^チャンネル .+ を外す$/ }),
    ).toHaveLength(SEARCH_MOST_CHANNELS)
  },
}
