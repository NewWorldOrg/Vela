import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, within } from 'storybook/test'

import type { ColumnDef } from '@tanstack/react-table'
import DataTable from '@/components/common/DataTable'
import { SectionHeading } from '@/components/vela/section-heading'
import { MarkDots } from '@/components/vela/icons'
import {
  WaitingRows,
  WaitingScreen,
  WAITING_LABEL,
} from '@/components/vela/waiting'

const meta = {
  title: 'Components/読み込み中',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

interface Row {
  name: string
  when: string
}

const COLUMNS: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: '番組' },
  { accessorKey: 'when', header: '放送日時' },
]

export const 主画面: Story = {
  render: () => (
    <div className="mx-auto max-w-[840px] p-6">
      <WaitingScreen />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole('status')).toHaveAccessibleName(WAITING_LABEL)
    await expect(
      canvasElement.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(2)
  },
}

export const 一覧の中: Story = {
  render: () => (
    <div className="mx-auto max-w-[840px] p-6">
      <SectionHeading mark={MarkDots}>一覧</SectionHeading>
      <WaitingRows rows={3} />
    </div>
  ),
}

export const 共通の表: Story = {
  render: () => (
    <div className="mx-auto max-w-[840px] p-6">
      <DataTable columns={COLUMNS} data={[]} loading />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByTestId('datatable-loading')).toBeVisible()
    await expect(canvasElement).not.toHaveTextContent(/Loading/)
  },
}
