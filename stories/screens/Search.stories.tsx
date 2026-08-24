import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'
import { getRouter } from '@storybook/nextjs/navigation.mock'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import type { SearchCondition, SearchResult } from '@/repository/search'
import { searchConditionOfQuery } from '@/repository/search-options'
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
 * The part the server plays. The screen keeps no condition of its own: it
 * writes the whole condition to the address and is handed it back on the next
 * render, so a story that does not answer the navigation cannot be asked what
 * a second choice does — the second choice would be drawn from the args, and
 * the question could not fail.
 */
function Live({ result }: { result: SearchResult }) {
  const [condition, setCondition] = useState<SearchCondition>(result.condition)

  getRouter().replace.mockImplementation((href: string) => {
    setCondition(searchConditionOfQuery(href.split('?')[1] ?? ''))
  })

  return <SearchView result={{ ...result, condition }} />
}

async function choose(list: string, option: string): Promise<void> {
  await userEvent.click(screen.getByRole('combobox', { name: list }))
  await userEvent.click(await screen.findByRole('option', { name: option }))
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
      await expect(router.replace).toHaveBeenLastCalledWith(
        '/search?q=%E5%A4%8F+%E7%B5%B6%E6%99%AF&genre=news',
        { scroll: false },
      )
    })
  },
}
