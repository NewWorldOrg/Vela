import type { Meta, StoryObj } from '@storybook/nextjs'

import type { SearchCondition } from '@/repository/search'
import { SEARCH_HIT_FIXTURES } from '@/repository/search.fixtures'
import { SearchView } from '@/components/search/search-page'

const emptyCondition: SearchCondition = {
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

const periodLabel = '8/9(土) 〜 8/15(金)'

const meta = {
  title: 'Screens/番組検索',
  component: SearchView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SearchView>

export default meta
type Story = StoryObj<typeof meta>

export const 入力前: Story = {
  args: {
    result: { condition: emptyCondition, outcome: { state: 'idle' } },
  },
}

export const 検索結果: Story = {
  args: {
    result: {
      condition,
      periodLabel,
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
      periodLabel,
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
      condition: { ...emptyCondition, q: '見つからない語' },
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
      outcome: {
        state: 'refused',
        message:
          'キーワードは2文字以上で指定してください。期間は開始日から終了日へ向かう最長 31 日の範囲で指定できます。',
      },
    },
  },
}
