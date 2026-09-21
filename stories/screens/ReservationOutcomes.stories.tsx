import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, within } from 'storybook/test'

import {
  EVERY_KIND_FIXTURES,
  OUTCOME_FIXTURES,
  outcomeLedger,
} from '@/stories/fixtures/reservation-outcomes'
import { OutcomeLedgerView } from '@/components/reservations/outcomes-page'
import {
  bodyRows,
  cellOf,
  pillOf,
  pillsIn,
  tipIn,
  widthOf,
} from '@/stories/pills-in-a-column'

function rowFor(cell: HTMLElement): HTMLElement {
  const row = cell.closest('tr')

  if (!row) {
    throw new Error('the cell is not in a row')
  }

  return row
}

const FAILURES: [string, string][] = [
  ['金曜シネマ「星の渡り鳥」', '競合'],
  ['午後のロードショー', '撮り逃し'],
  ['朝のニュース', '選局失敗'],
  ['山あいの町から', '録画失敗'],
]

const KIND_COLUMN = 6

const meta = {
  title: 'Screens/予約結果台帳',
  component: OutcomeLedgerView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof OutcomeLedgerView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = {
  args: { result: outcomeLedger(OUTCOME_FIXTURES) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getAllByRole('row').slice(1).length).toBe(
      OUTCOME_FIXTURES.length,
    )

    await expect(
      canvas
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[7].textContent),
    ).toEqual(['2026/09/02 02:31', '2026/08/27 22:41', '2026/08/27 19:56'])

    for (const row of canvas.getAllByRole('row').slice(1)) {
      await expect(within(row).getByText('録画失敗')).toBeInTheDocument()
    }

    await expect(canvas.queryByText('失敗', { exact: true })).toBeNull()
  },
}

export const 分類がそろう: Story = {
  args: { result: outcomeLedger(EVERY_KIND_FIXTURES) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    for (const [title, word] of FAILURES) {
      await expect(
        within(rowFor(canvas.getByText(title)))
          .getByText(word)
          .getAttribute('data-variant'),
      ).toBe('err')
    }

    const moved = rowFor(canvas.getByText('夕暮れの図書室'))
    const gone = rowFor(canvas.getAllByText('海辺の紀行')[0])
    const returned = rowFor(canvas.getAllByText('海辺の紀行')[1])

    await expect(
      within(moved).getByText('番組追従').getAttribute('data-variant'),
    ).toBe('sky')
    await expect(
      within(gone).getByText('番組消失').getAttribute('data-variant'),
    ).toBe('warn')
    await expect(
      within(returned).getByText('番組復帰').getAttribute('data-variant'),
    ).toBe('ok')

    const refusedAgain = rowFor(canvas.getAllByText('深夜の天気図')[0])
    const startedAgain = rowFor(canvas.getByText('朝焼けの港'))
    const gaveUp = rowFor(canvas.getAllByText('深夜の天気図')[1])

    await expect(
      within(refusedAgain).getByText('始め直し').getAttribute('data-variant'),
    ).toBe('sky')
    const refusedTip = await tipIn(cellOf(refusedAgain, KIND_COLUMN))

    await expect(refusedTip).toHaveTextContent('再び失敗')
    await expect(refusedTip).toHaveTextContent('① 信号を掴めない')
    await expect(
      await tipIn(cellOf(startedAgain, KIND_COLUMN)),
    ).toHaveTextContent('録画開始')
    await expect(
      within(gaveUp).getByText('始め直しを断念').getAttribute('data-variant'),
    ).toBe('err')
    await expect(await tipIn(cellOf(gaveUp, KIND_COLUMN))).toHaveTextContent(
      '試行の上限',
    )

    const noLock = rowFor(canvas.getByText('朝のニュース'))
    const psi = rowFor(canvas.getAllByText('真夜中の音楽室')[0])

    await expect(await tipIn(cellOf(noLock, KIND_COLUMN))).toHaveTextContent(
      '① 信号を掴めない',
    )
    await expect(await tipIn(cellOf(psi, KIND_COLUMN))).toHaveTextContent(
      '③ 情報が揃わない',
    )

    const cutShort = rowFor(canvas.getByText('週末キッチンの手帖'))

    await expect(await tipIn(cellOf(cutShort, KIND_COLUMN))).toHaveTextContent(
      '尻切れ',
    )

    const contest = rowFor(canvas.getByText('金曜シネマ「星の渡り鳥」'))

    await expect(canvas.queryByText('ナイター中継 延長あり')).toBeNull()

    await userEvent.click(within(contest).getByRole('button'))

    await expect(canvas.getByText('ナイター中継 延長あり')).toBeInTheDocument()
    await expect(canvas.getByText('真昼の博物誌')).toBeInTheDocument()
    await expect(canvas.getByText('記録が残っていません')).toBeInTheDocument()
    await expect(canvas.queryByText(/r-90/)).toBeNull()

    await expect(
      canvas.getAllByRole('button', { name: /代わりに/ }),
    ).toHaveLength(1)
  },
}

export const 空の台帳: Story = {
  args: { result: outcomeLedger([]) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('heading', { name: '録れなかった予約はありません' }),
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole('link', { name: '予約一覧へ' }),
    ).toHaveAttribute('href', '/reservations')
    await expect(canvas.queryByRole('table')).toBeNull()
  },
}

export const 絞り込んで空: Story = {
  args: {
    result: outcomeLedger([], { filter: { kind: 'competing' }, total: 0 }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('heading', { name: '条件に合う記録がありません' }),
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole('button', { name: '絞り込みを解除' }),
    ).toBeEnabled()
  },
}

export const 札の並び: Story = {
  args: { result: outcomeLedger(EVERY_KIND_FIXTURES) },
  play: async ({ canvasElement }) => {
    const rows = bodyRows(canvasElement)

    await expect(rows.length).toBeGreaterThan(3)

    for (const row of rows) {
      await expect(pillsIn(row, KIND_COLUMN).length).toBe(1)
    }

    const pills = rows.map((row) => pillOf(row, KIND_COLUMN))

    await expect(new Set(pills.map(widthOf)).size).toBe(1)
    await expect(
      new Set(
        pills.map((pill) => Math.round(pill.getBoundingClientRect().left)),
      ).size,
    ).toBe(1)
    await expect(
      new Set(pills.map((pill) => pill.textContent ?? '')).size,
    ).toBeGreaterThan(1)
  },
}
