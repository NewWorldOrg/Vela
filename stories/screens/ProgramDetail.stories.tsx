import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, within } from 'storybook/test'

import { PROGRAM_DETAIL_FIXTURES } from '@/repository/programs.fixtures'
import { ProgramDetailView } from '@/components/guide/program-detail-page'

const meta = {
  title: 'Screens/番組詳細',
  component: ProgramDetailView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ProgramDetailView>

export default meta
type Story = StoryObj<typeof meta>

/**
 * The screen a programme's own address opens, drawn from the programme alone.
 * Nothing of the guide is handed to it — no day being read, no line-up, no
 * scroll position — so the address opened cold gives the same screen as the
 * address opened from the panel: the programme, the service it is on, when it
 * runs, what it says, and the way back to the guide.
 */
const standard = PROGRAM_DETAIL_FIXTURES.standard

export const 通常: Story = {
  args: { detail: standard },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole('heading', { name: standard.program.title }),
    ).toBeVisible()
    await expect(canvas.getByText(standard.program.genreLabel)).toBeVisible()
    await expect(
      canvas.getByText(`/guide/programs/${standard.program.id}`),
    ).toBeVisible()
    await expect(
      canvas.getByRole('link', { name: '番組表へ' }),
    ).toHaveAttribute('href', '/guide')
  },
}

export const リレーあり: Story = {
  args: { detail: PROGRAM_DETAIL_FIXTURES.relayed },
}

export const 同時放送の重複: Story = {
  args: { detail: PROGRAM_DETAIL_FIXTURES.simulcast },
}

export const 終了未定: Story = {
  args: { detail: PROGRAM_DETAIL_FIXTURES.undecided },
}

export const 情報最小: Story = {
  args: { detail: PROGRAM_DETAIL_FIXTURES.minimal },
}

export const 改行を含む本文: Story = {
  args: { detail: PROGRAM_DETAIL_FIXTURES.multiline },
}
