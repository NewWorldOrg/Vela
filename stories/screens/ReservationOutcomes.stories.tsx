import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, within } from 'storybook/test'

import {
  EVERY_KIND_FIXTURES,
  OUTCOME_FIXTURES,
  outcomeLedger,
} from '@/stories/fixtures/reservation-outcomes'
import { OutcomeLedgerView } from '@/components/reservations/outcomes-page'

function rowFor(cell: HTMLElement): HTMLElement {
  const row = cell.closest('tr')

  if (!row) {
    throw new Error('the cell is not in a row')
  }

  return row
}

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

    for (const word of ['競合', '撮り逃し', '選局失敗', '録画失敗']) {
      await expect(canvas.getAllByText(word).length).toBeGreaterThan(0)
    }

    const noLock = rowFor(canvas.getByText('朝のニュース'))
    const psi = rowFor(canvas.getAllByText('真夜中の音楽室')[0])

    await expect(
      within(noLock).getByText('① 信号を掴めない'),
    ).toBeInTheDocument()
    await expect(within(psi).getByText('③ 情報が揃わない')).toBeInTheDocument()

    const cutShort = rowFor(canvas.getByText('週末キッチンの手帖'))

    await expect(within(cutShort).getByText('尻切れ')).toBeInTheDocument()

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
