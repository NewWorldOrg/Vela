import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, within } from 'storybook/test'

import type { ProgramDetail } from '@/repository/programs'
import {
  NOW_MIN,
  PROGRAM_DETAIL_FIXTURES,
} from '@/repository/programs.fixtures'
import type { ReservationWrite } from '@/repository/reservations'
import { ProgramDetailView } from '@/components/guide/program-detail-page'

const meta = {
  title: 'Screens/番組詳細',
  component: ProgramDetailView,
  parameters: { layout: 'fullscreen' },
  args: {
    onReserve: async (): Promise<ReservationWrite> => ({ state: 'ok' }),
  },
} satisfies Meta<typeof ProgramDetailView>

export default meta
type Story = StoryObj<typeof meta>

/**
 * The screen a programme's own address opens, drawn from the programme alone.
 * Nothing of the guide is handed to it — no day being read, no line-up, no
 * scroll position — so the address opened cold gives the same screen as the
 * address opened from anywhere else: the programme, the service it is on, when
 * it runs, what it says, and the way back to the guide.
 */
const standard = PROGRAM_DETAIL_FIXTURES.standard

/** Everything the page is asked to draw for a programme it was handed. */
async function reads(
  canvasElement: HTMLElement,
  detail: ProgramDetail,
): Promise<void> {
  const canvas = within(canvasElement)
  const { program } = detail
  const body = canvasElement.querySelector<HTMLElement>('[data-program-detail]')

  await expect(body).not.toBeNull()

  const reading = (body!.textContent ?? '').replace(/\s+/g, ' ').trim()

  await expect(
    canvas.getByRole('heading', { name: program.title }),
  ).toBeVisible()
  await expect(reading).toContain(program.genreLabel)
  await expect(reading).toContain(program.startLabel)

  if (program.description) {
    await expect(reading).toContain(
      program.description.replace(/\s+/g, ' ').trim(),
    )
  }

  for (const item of program.items ?? []) {
    await expect(
      canvas.getByRole('heading', { name: item.heading }),
    ).toBeVisible()
    await expect(reading).toContain(item.text.replace(/\s+/g, ' ').trim())
  }

  for (const other of program.related ?? []) {
    await expect(
      canvasElement.querySelector(`a[href="/guide/programs/${other.key}"]`),
    ).not.toBeNull()
  }
}

export const 通常: Story = {
  args: { detail: standard },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await reads(canvasElement, standard)
    await expect(
      canvas.getByRole('link', { name: '番組表へ' }),
    ).toHaveAttribute('href', '/guide')
  },
}

export const リレーあり: Story = {
  args: { detail: PROGRAM_DETAIL_FIXTURES.relayed },
  play: async ({ canvasElement }) => {
    await reads(canvasElement, PROGRAM_DETAIL_FIXTURES.relayed)
  },
}

export const 同時放送の重複: Story = {
  args: { detail: PROGRAM_DETAIL_FIXTURES.simulcast },
  play: async ({ canvasElement }) => {
    await reads(canvasElement, PROGRAM_DETAIL_FIXTURES.simulcast)
  },
}

export const 終了未定: Story = {
  args: { detail: PROGRAM_DETAIL_FIXTURES.undecided },
  play: async ({ canvasElement }) => {
    await reads(canvasElement, PROGRAM_DETAIL_FIXTURES.undecided)
    await expect(
      canvasElement.querySelector('[data-program-detail]')?.textContent,
    ).toContain('終了未定')
  },
}

/**
 * A programme the broadcaster said nothing more about than its name and its
 * hour. The page is drawn from that alone, and the one row every programme can
 * answer is still answered.
 */
export const 情報最小: Story = {
  args: { detail: PROGRAM_DETAIL_FIXTURES.minimal },
  play: async ({ canvasElement }) => {
    const detail = PROGRAM_DETAIL_FIXTURES.minimal

    await reads(canvasElement, detail)
    await expect(detail.program.description).toBeUndefined()
    await expect(detail.program.items ?? []).toHaveLength(0)
    await expect(
      canvasElement.querySelectorAll('[data-program-detail] h2'),
    ).toHaveLength(0)
    await expect(
      canvasElement.querySelector('[data-program-detail] dl dd')?.textContent,
    ).toBe('なし')
  },
}

export const 改行を含む本文: Story = {
  args: { detail: PROGRAM_DETAIL_FIXTURES.multiline },
  play: async ({ canvasElement }) => {
    await reads(canvasElement, PROGRAM_DETAIL_FIXTURES.multiline)
  },
}

/**
 * The programme is on air as the page reads the clock, so the way to the live
 * screen is offered, with this channel chosen — the address the live screen's
 * own list would have made. Off the air it is not there at all: a way into a
 * picture that is not being broadcast leads nowhere.
 */
export const 放送中: Story = {
  args: { detail: { ...standard, nowMin: NOW_MIN } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)

    await reads(canvasElement, args.detail)
    await expect(
      canvas.getByRole('link', { name: 'ライブ視聴' }),
    ).toHaveAttribute('href', `/live?ch=${standard.program.channelId}`)
  },
}

export const 放送前: Story = {
  args: { detail: { ...standard, nowMin: standard.program.startMin - 1 } },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).queryByRole('link', { name: 'ライブ視聴' }),
    ).toBeNull()
  },
}
