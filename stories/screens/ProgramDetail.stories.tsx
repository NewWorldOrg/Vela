import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, within } from 'storybook/test'

import { isOnAir, relationDestinationOf } from '@/lib/guide'
import { searchConditionOfQuery, searchTermsOf } from '@/lib/search-condition'
import type { ProgramDetail } from '@/repository/programs'
import {
  NOW_MIN,
  PROGRAM_DETAIL_FIXTURES,
} from '@/repository/programs.fixtures'
import type { ReservationWrite } from '@/repository/reservations'
import { ProgramDetailView } from '@/components/guide/program-detail-page'
import { inTheApp } from '@/stories/frames'

const meta = {
  title: 'Screens/番組詳細',
  component: ProgramDetailView,
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/guide/programs/p001' },
    },
    layout: 'fullscreen',
  },
  args: {
    onReserve: async (): Promise<ReservationWrite> => ({ state: 'ok' }),
  },
  decorators: [inTheApp],
} satisfies Meta<typeof ProgramDetailView>

export default meta
type Story = StoryObj<typeof meta>

const standard = PROGRAM_DETAIL_FIXTURES.standard

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
    const destination = relationDestinationOf(
      other,
      isOnAir(program, detail.nowMin),
    )

    if (destination.to === 'programme') {
      await expect(
        canvasElement.querySelector(
          `a[href="/guide/programs/${destination.key}"]`,
        ),
      ).not.toBeNull()
    }

    if (destination.to === 'live') {
      await expect(
        canvasElement.querySelector(
          `a[href^="/live?ch=${destination.channelId}"]`,
        ),
      ).not.toBeNull()
    }
  }
}

const simulcast = PROGRAM_DETAIL_FIXTURES.simulcast

const simulcastElsewhere = (simulcast.program.related ?? []).filter(
  (other) => other.kind === 'shared',
)

export const 同時放送は放送中ならライブへ: Story = {
  args: {
    detail: { ...simulcast, nowMin: simulcast.program.startMin + 1 },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)

    await reads(canvasElement, args.detail)
    await expect(simulcastElsewhere.length).toBeGreaterThan(0)

    const links = canvas.getAllByRole('link', { name: '同時放送を見る' })

    await expect(links).toHaveLength(simulcastElsewhere.length)

    for (const [index, other] of simulcastElsewhere.entries()) {
      await expect(links[index]).toHaveAttribute(
        'href',
        `/live?ch=${other.channelId}`,
      )
    }

    await expect(
      canvasElement.querySelector('a[href^="/guide/programs/"]'),
    ).toBeNull()
  },
}

export const 同時放送は放送前なら案内だけ: Story = {
  args: {
    detail: { ...simulcast, nowMin: simulcast.program.startMin - 1 },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getAllByText(/でも同時に放送されます。/).length,
    ).toBeGreaterThan(0)
    await expect(
      canvas.queryByRole('link', { name: '同時放送を見る' }),
    ).toBeNull()
  },
}

export const 同時放送は放送後なら案内だけ: Story = {
  args: {
    detail: {
      ...simulcast,
      nowMin: simulcast.program.startMin + simulcast.program.durationMin,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getAllByText(/でも同時に放送されます。/).length,
    ).toBeGreaterThan(0)
    await expect(
      canvas.queryByRole('link', { name: '同時放送を見る' }),
    ).toBeNull()
  },
}

const relayedToACopy: ProgramDetail = {
  ...PROGRAM_DETAIL_FIXTURES.relayed,
  program: {
    ...PROGRAM_DETAIL_FIXTURES.relayed.program,
    related: (PROGRAM_DETAIL_FIXTURES.relayed.program.related ?? []).map(
      (other) => ({ ...other, shadow: other.kind === 'relayed' }),
    ),
  },
}

export const 継続先が写しなら番組の詳細へは送らない: Story = {
  args: { detail: relayedToACopy },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText(/で継続されます。/)).toBeVisible()
    await expect(
      canvas.queryByRole('link', { name: '継続先を見る' }),
    ).toBeNull()
  },
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

export const シリーズはルールの下書きへ渡す: Story = {
  args: { detail: standard },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const asked = new URL(
      canvas
        .getByRole('link', { name: 'シリーズで予約' })
        .getAttribute('href')!,
      'http://vela.invalid',
    )
    const readBack = searchTermsOf(
      searchConditionOfQuery(asked.searchParams.toString()),
    )

    await expect(asked.pathname).toBe('/reservations/rules')
    await expect(asked.searchParams.get('rule')).toBe('new')
    await expect(readBack.fields).toBe('title')
    await expect(readBack.channels).toEqual([standard.program.channelId])
    await expect(readBack.q).toBeTruthy()
    await expect(standard.program.title).toContain(readBack.q)

    await expect(
      canvas.queryByRole('button', { name: 'シリーズで予約' }),
    ).toBeNull()
  },
}

const nameless: ProgramDetail = {
  ...standard,
  program: { ...standard.program, title: '' },
}

export const 名前の無い番組はシリーズにできない: Story = {
  args: { detail: nameless },
  parameters: { a11y: { context: { include: '[data-program-detail]' } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.queryByRole('link', { name: 'シリーズで予約' }),
    ).toBeNull()
    await expect(
      canvas.getByRole('button', { name: 'シリーズで予約' }),
    ).toBeDisabled()
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
