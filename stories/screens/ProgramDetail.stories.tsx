import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'

import { isOnAir, relationDestinationOf } from '@/lib/guide'
import { searchConditionOfQuery, searchTermsOf } from '@/lib/search-condition'
import type { ProgramDetail } from '@/repository/programs'
import {
  NOW_MIN,
  PROGRAM_DETAIL_FIXTURES,
  PROGRAM_FIXTURES,
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
    onCancel: fn(async (): Promise<ReservationWrite> => ({ state: 'ok' })),
    onRevise: fn(async (): Promise<ReservationWrite> => ({ state: 'ok' })),
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

    const links = canvas.getAllByRole('link', { name: '同時放送へ' })

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
    await expect(canvas.queryByRole('link', { name: '同時放送へ' })).toBeNull()
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
    await expect(canvas.queryByRole('link', { name: '同時放送へ' })).toBeNull()
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
    await expect(canvas.queryByRole('link', { name: '継続先へ' })).toBeNull()
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

const BOOKING = PROGRAM_FIXTURES.find((program) => program.booking)!.booking!

const booked: ProgramDetail = {
  ...standard,
  program: { ...standard.program, booked: true, booking: BOOKING },
}

const beingRecorded: ProgramDetail = {
  ...standard,
  program: {
    ...standard.program,
    booked: true,
    booking: { ...BOOKING, standing: 'recording' },
  },
}

export const 予約済み: Story = {
  args: { detail: booked },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await reads(canvasElement, booked)

    await expect(canvas.getByText('確保済み')).toBeVisible()
    await expect(canvas.queryByRole('button', { name: '録画予約' })).toBeNull()
    await expect(
      canvas.queryByRole('link', { name: 'シリーズで予約' }),
    ).toBeNull()

    await userEvent.click(
      canvas.getByRole('button', { name: '予約を取り消し' }),
    )

    await waitFor(() => expect(args.onCancel).toHaveBeenCalledTimes(1))
    await expect(args.onCancel).toHaveBeenCalledWith(BOOKING.id)
  },
}

const PUSHED_OUT = [
  {
    title: '夜ふかしラジオ倶楽部',
    meta: '湾岸放送1 · 22:30 – 23:30',
    origin: '手動',
  },
]

export const 予約して競合になった予約を示す: Story = {
  args: {
    detail: standard,
    onReserve: async (): Promise<ReservationWrite> => ({
      state: 'ok',
      verdict: 'secured',
      displaced: PUSHED_OUT,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.queryByText('次の予約が競合になりました。')).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: '録画予約' }))

    const notice = (
      await canvas.findByText('次の予約が競合になりました。')
    ).closest('[data-slot="displaced"]') as HTMLElement

    await expect(notice).toHaveTextContent('夜ふかしラジオ倶楽部')
    await expect(notice).toHaveTextContent('湾岸放送1 · 22:30 – 23:30')
  },
}

export const 予約済みの編集で競合になった予約を示す: Story = {
  args: {
    detail: booked,
    onRevise: fn(async (): Promise<ReservationWrite> => ({
      state: 'ok',
      verdict: 'secured',
      displaced: PUSHED_OUT,
    })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '予約を変更' }))
    const dialog = within(await screen.findByRole('dialog'))

    await userEvent.click(dialog.getByRole('switch', { name: 'エンコード' }))
    await userEvent.click(dialog.getByRole('button', { name: '保存する' }))

    await expect(
      await canvas.findByText('次の予約が競合になりました。'),
    ).toBeVisible()
    await expect(canvas.getByText('確保済み')).toBeVisible()
  },
}

export const 予約済みから編集を開く: Story = {
  args: { detail: booked },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '予約を変更' }))

    await expect(
      await screen.findByRole('heading', { name: '予約を変更' }),
    ).toBeVisible()
  },
}

const HELD_BY_ANOTHER =
  '録画が始まっているため、この予約は取り消せませんでした。'

export const 取り消しを断られたとき: Story = {
  args: {
    detail: booked,
    onCancel: fn(async (): Promise<ReservationWrite> => ({
      state: 'rejected',
      message: HELD_BY_ANOTHER,
    })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getByRole('button', { name: '予約を取り消し' }),
    )

    await expect(await canvas.findByText(HELD_BY_ANOTHER)).toBeVisible()
    await expect(canvas.getByText('確保済み')).toBeVisible()
  },
}

export const 録画中: Story = {
  args: { detail: { ...beingRecorded, nowMin: NOW_MIN } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await reads(canvasElement, beingRecorded)

    await expect(canvas.getByText('録画中')).toBeVisible()
    await expect(canvas.queryByText('確保済み')).toBeNull()
    await expect(
      canvas.queryByRole('button', { name: '予約を取り消し' }),
    ).toBeNull()
    await expect(
      canvas.queryByRole('button', { name: '予約を変更' }),
    ).toBeNull()
    await expect(canvas.queryByRole('button', { name: '録画予約' })).toBeNull()
  },
}

const MOVED =
  'この番組の放送枠は 中央テレビ1 の 08/08(金) 21:00 からに移動しているため、予約できませんでした。移動先の番組を予約してください。'

export const 移動した放送の元の枠を予約しようとしたとき: Story = {
  args: {
    detail: standard,
    onReserve: async (): Promise<ReservationWrite> => ({
      state: 'rejected',
      message: MOVED,
      movedTo: '131-1310-50001',
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: '録画予約' }))

    const refused = await canvas.findByRole('alert')

    await expect(refused).toHaveTextContent(MOVED)
    await expect(
      within(refused).getByRole('link', { name: '移動先へ' }),
    ).toHaveAttribute('href', '/guide/programs/131-1310-50001')
  },
}
