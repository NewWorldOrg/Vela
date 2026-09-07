import { useState, type ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import { CHANNEL_FIXTURES } from '@/repository/channels.fixtures'
import type { Program } from '@/repository/programs'
import type { ReservationWrite } from '@/repository/reservations'
import { Button } from '@/components/ui/button'
import {
  PROGRAM_DAY,
  PROGRAM_DETAIL_FIXTURES,
  PROGRAM_FIXTURES,
} from '@/repository/programs.fixtures'
import { ProgramDetailView } from '@/components/guide/program-detail-page'
import { ProgramPanel } from '@/components/guide/program-panel'

const standard = PROGRAM_DETAIL_FIXTURES.standard.program
const relayed = PROGRAM_DETAIL_FIXTURES.relayed.program
const undecided = PROGRAM_DETAIL_FIXTURES.undecided.program
const multiline = PROGRAM_DETAIL_FIXTURES.multiline.program

const bare = PROGRAM_DETAIL_FIXTURES.minimal.program

const booked: Program = {
  ...standard,
  booked: true,
  booking: PROGRAM_FIXTURES.find((program) => program.booking)!.booking,
}

const wordy: Program = {
  ...multiline,
  description: Array.from(
    { length: 14 },
    () => multiline.description ?? '',
  ).join('\n'),
}

const channelOf = (channelId: string) =>
  CHANNEL_FIXTURES.find((channel) => channel.id === channelId)

const ONLY_THE_OPEN_LAYER = {
  a11y: { context: { include: '[data-slot="dialog-content"]' } },
}

const meta = {
  title: 'Components/ProgramPanel',
  component: ProgramPanel,
  parameters: { layout: 'fullscreen', ...ONLY_THE_OPEN_LAYER },
  args: {
    dayLabel: PROGRAM_DAY.label,
    open: true,
    onClose: fn(),
    onReserve: async (): Promise<ReservationWrite> => ({ state: 'ok' }),
    onCancel: async (): Promise<ReservationWrite> => ({ state: 'ok' }),
    onRevise: async (): Promise<ReservationWrite> => ({ state: 'ok' }),
  },
} satisfies Meta<typeof ProgramPanel>

export default meta
type Story = StoryObj<typeof meta>

const AT_MOST_ACROSS = 896

const BESIDE_IT = 40

const AT_MOST_DOWN = 0.85

const surfaceIn = (canvasElement: HTMLElement): HTMLElement | null =>
  canvasElement.ownerDocument.querySelector<HTMLElement>(
    '[data-slot="dialog-content"]',
  )

const overlayIn = (canvasElement: HTMLElement): HTMLElement | null =>
  canvasElement.ownerDocument.querySelector<HTMLElement>(
    '[data-slot="dialog-overlay"]',
  )

async function opened(canvasElement: HTMLElement): Promise<HTMLElement> {
  return waitFor(() => {
    const surface = surfaceIn(canvasElement)

    if (surface === null) {
      throw new Error('nothing is open')
    }

    if (!surface.contains(canvasElement.ownerDocument.activeElement)) {
      throw new Error('the surface does not hold focus')
    }

    return surface
  })
}

function detailIn(root: ParentNode): HTMLElement {
  const found = root.querySelector<HTMLElement>('[data-program-detail]')

  if (found === null) {
    throw new Error('the programme is not drawn')
  }

  return found
}

const plain = (text: string): string => text.replace(/\s+/g, ' ').trim()

const wordsOf = (element: HTMLElement): string =>
  plain(element.textContent ?? '')

const subtitlesRowOf = (detail: HTMLElement): string | undefined =>
  detail.querySelector('dl dd')?.textContent ?? undefined

async function reads(surface: HTMLElement, program: Program): Promise<void> {
  const shown = within(surface)
  const detail = detailIn(surface)

  await expect(
    shown.getByRole('heading', { name: program.title }),
  ).toBeVisible()
  await expect(shown.getByText(program.genreLabel)).toBeVisible()

  const reading = wordsOf(detail)

  await expect(reading).toContain(program.startLabel)

  if (program.description) {
    await expect(reading).toContain(plain(program.description))
  }

  for (const item of program.items ?? []) {
    await expect(
      shown.getByRole('heading', { name: item.heading }),
    ).toBeVisible()
    await expect(reading).toContain(plain(item.text))
  }

  await expect(subtitlesRowOf(detail)).toBe(program.subtitled ? 'あり' : 'なし')
  await expect(
    surface.querySelector(`a[href="/guide/programs/${program.id}"]`),
  ).toBeNull()
}

export const 通常: Story = {
  args: { program: standard, channel: channelOf(standard.channelId) },
  play: async ({ canvasElement }) => {
    await reads(await opened(canvasElement), standard)
  },
}

export const 情報最小: Story = {
  args: { program: bare, channel: channelOf(bare.channelId) },
  play: async ({ canvasElement }) => {
    const surface = await opened(canvasElement)

    await reads(surface, bare)

    const shown = within(surface)

    await expect(bare.items ?? []).toHaveLength(0)
    await expect(bare.related ?? []).toHaveLength(0)
    await expect(bare.description).toBeUndefined()
    await expect(detailIn(surface).querySelectorAll('h2')).toHaveLength(0)
    await expect(
      surface.querySelectorAll('a[href^="/guide/programs/"]'),
    ).toHaveLength(0)
    await expect(shown.getByRole('button', { name: '録画予約' })).toBeEnabled()
  },
}

export const 関連番組あり: Story = {
  args: { program: relayed, channel: channelOf(relayed.channelId) },
  play: async ({ canvasElement }) => {
    const surface = await opened(canvasElement)

    await reads(surface, relayed)

    const elsewhere = relayed.related ?? []

    await expect(elsewhere.length).toBeGreaterThan(0)

    for (const other of elsewhere) {
      const to = surface.querySelector<HTMLElement>(
        `a[href="/guide/programs/${other.key}"]`,
      )

      await expect(to).not.toBeNull()
      await expect(to!).toBeVisible()
    }
  },
}

export const 終了未定: Story = {
  args: { program: undecided, channel: channelOf(undecided.channelId) },
  play: async ({ canvasElement }) => {
    const surface = await opened(canvasElement)

    await reads(surface, undecided)

    const reading = wordsOf(detailIn(surface))

    await expect(reading).toContain('終了未定')
  },
}

export const 予約済み: Story = {
  args: { program: booked, channel: channelOf(booked.channelId) },
  play: async ({ canvasElement }) => {
    const surface = await opened(canvasElement)

    await reads(surface, booked)

    const shown = within(surface)

    await expect(shown.getByText('チューナー確保済み')).toBeVisible()
    await expect(
      shown.getByRole('button', { name: '予約を取り消す' }),
    ).toBeEnabled()
    await expect(shown.queryByRole('button', { name: '録画予約' })).toBeNull()
  },
}

export const 改行を含む本文: Story = {
  args: { program: multiline, channel: channelOf(multiline.channelId) },
  play: async ({ canvasElement }) => {
    await reads(await opened(canvasElement), multiline)
  },
}

export const 別ページと同じ中身: Story = {
  args: { program: relayed, channel: channelOf(relayed.channelId) },
  render: (args) => (
    <>
      <ProgramDetailView
        detail={{
          program: args.program,
          channel: args.channel,
          day: PROGRAM_DAY,
        }}
        onReserve={args.onReserve}
      />
      <ProgramPanel {...args} />
    </>
  ),
  play: async ({ canvasElement }) => {
    const surface = await opened(canvasElement)

    await reads(surface, relayed)

    const inTheLayer = wordsOf(detailIn(surface))
    const onThePage = wordsOf(detailIn(canvasElement))

    for (const item of relayed.items ?? []) {
      await expect(onThePage).toContain(item.heading)
    }

    await expect(inTheLayer).toBe(onThePage)
  },
}

const showing: Story['args'] = {
  program: standard,
  channel: channelOf(standard.channelId),
}

export const 範囲外を押すと閉じる: Story = {
  args: showing,
  play: async ({ args, canvasElement }) => {
    await reads(await opened(canvasElement), standard)

    const outside = overlayIn(canvasElement)

    await expect(outside).not.toBeNull()
    await userEvent.click(outside!)
    await waitFor(() => expect(args.onClose).toHaveBeenCalled())
  },
}

export const 中を押しても閉じない: Story = {
  args: showing,
  play: async ({ args, canvasElement }) => {
    const surface = await opened(canvasElement)

    await userEvent.click(within(surface).getByText(standard.title))
    await expect(args.onClose).not.toHaveBeenCalled()
    await expect(surfaceIn(canvasElement)).not.toBeNull()
  },
}

export const Escで閉じる: Story = {
  args: showing,
  play: async ({ args, canvasElement }) => {
    await reads(await opened(canvasElement), standard)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(args.onClose).toHaveBeenCalled())
  },
}

const heard = fn()

export const 開く操作を押しても閉じる: Story = {
  args: showing,
  render: (args) => (
    <>
      <Button data-opens="program-panel" onClick={() => heard()}>
        別の番組
      </Button>
      <ProgramPanel {...args} />
    </>
  ),
  play: async ({ args, canvasElement }) => {
    heard.mockClear()

    await opened(canvasElement)

    const another = canvasElement.querySelector<HTMLElement>(
      '[data-opens="program-panel"]',
    )

    await expect(another).not.toBeNull()

    const at = another!.getBoundingClientRect()

    await expect(at.width).toBeGreaterThan(0)

    const takesIt = canvasElement.ownerDocument.elementFromPoint(
      at.left + at.width / 2,
      at.top + at.height / 2,
    )

    await expect(takesIt).toBe(overlayIn(canvasElement))
    await userEvent.click(takesIt as HTMLElement)
    await waitFor(() => expect(args.onClose).toHaveBeenCalled())
    await expect(heard).not.toHaveBeenCalled()
  },
}

export const 予約の編集が上に重なる: Story = {
  args: { program: booked, channel: channelOf(booked.channelId) },
  play: async ({ args, canvasElement }) => {
    const doc = canvasElement.ownerDocument
    const programme = await opened(canvasElement)

    await userEvent.click(
      within(programme).getByRole('button', { name: '予約を編集' }),
    )

    const surfaces = () =>
      Array.from(
        doc.querySelectorAll<HTMLElement>('[data-slot="dialog-content"]'),
      )

    await waitFor(() => expect(surfaces()).toHaveLength(2))

    const editing = surfaces().find((one) => one !== programme)!

    await expect(
      within(editing).getByRole('heading', { name: '予約を編集' }),
    ).toBeVisible()
    await waitFor(() => expect(editing.contains(doc.activeElement)).toBe(true))

    const takesIt = doc.elementFromPoint(4, 4)

    await expect(takesIt).not.toBeNull()
    await expect(editing.contains(takesIt)).toBe(false)
    await expect(programme.contains(takesIt)).toBe(false)
    await userEvent.click(takesIt as HTMLElement)
    await expect(surfaces()).toHaveLength(2)
    await expect(args.onClose).not.toHaveBeenCalled()

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(surfaces()).toHaveLength(1))
    await expect(args.onClose).not.toHaveBeenCalled()
    await reads(surfaces()[0], booked)

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(args.onClose).toHaveBeenCalled())
  },
}

function PanelWithOpener(args: ComponentProps<typeof ProgramPanel>) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button data-opens="program-panel" onClick={() => setOpen(true)}>
        別の番組
      </Button>
      <ProgramPanel {...args} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export const 閉じるとフォーカスが戻る: Story = {
  args: showing,
  render: (args) => <PanelWithOpener {...args} />,
  play: async ({ canvasElement }) => {
    const opener = within(canvasElement).getByRole('button', {
      name: '別の番組',
    })

    await userEvent.click(opener)
    await reads(await opened(canvasElement), standard)

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(surfaceIn(canvasElement)).toBeNull())
    await waitFor(() => expect(opener).toHaveFocus())
  },
}

const A_NARROW_WINDOW = { width: 460, height: 900 }

const A_WIDE_WINDOW = { width: 1680, height: 1000 }

const A_SNUG_WINDOW = { width: 900, height: 900 }

const A_SHORT_WINDOW = { width: 1280, height: 560 }

async function acrossTheWindow(
  canvasElement: HTMLElement,
  asked: number,
): Promise<void> {
  const surface = await opened(canvasElement)
  const doc = canvasElement.ownerDocument
  const view = doc.defaultView!

  await expect(view.innerWidth).toBe(asked)
  await expect(surface.getBoundingClientRect().width).toBeCloseTo(
    Math.min(AT_MOST_ACROSS, view.innerWidth - BESIDE_IT),
    0,
  )
  await expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(
    view.innerWidth,
  )
}

export const 狭い窓では窓に合わせて縮む: Story = {
  args: showing,
  parameters: { screen: A_NARROW_WINDOW },
  play: async ({ canvasElement }) => {
    await acrossTheWindow(canvasElement, A_NARROW_WINDOW.width)
  },
}

export const 広い窓では読める幅で止まる: Story = {
  args: showing,
  parameters: { screen: A_WIDE_WINDOW },
  play: async ({ canvasElement }) => {
    await acrossTheWindow(canvasElement, A_WIDE_WINDOW.width)
  },
}

export const 幅ぎりぎりの窓でも脇が残る: Story = {
  args: showing,
  parameters: { screen: A_SNUG_WINDOW },
  play: async ({ canvasElement }) => {
    await acrossTheWindow(canvasElement, A_SNUG_WINDOW.width)
  },
}

export const 長い本文は面の中で送る: Story = {
  args: { program: wordy, channel: channelOf(wordy.channelId) },
  parameters: { screen: A_SHORT_WINDOW },
  play: async ({ canvasElement }) => {
    const surface = await opened(canvasElement)
    const doc = canvasElement.ownerDocument
    const view = doc.defaultView!

    await expect(view.innerHeight).toBe(A_SHORT_WINDOW.height)

    const box = surface.getBoundingClientRect()

    await expect(box.height).toBeCloseTo(view.innerHeight * AT_MOST_DOWN, 0)
    await expect(doc.documentElement.scrollHeight).toBeLessThanOrEqual(
      view.innerHeight,
    )

    const reading = surface.querySelector<HTMLElement>(
      '[data-slot="dialog-body"]',
    )

    await expect(reading).not.toBeNull()
    await expect(reading!.scrollHeight).toBeGreaterThan(reading!.clientHeight)

    const title = within(surface).getByRole('heading', { name: wordy.title })
    const heading = title.getBoundingClientRect()

    await expect(heading.top).toBeGreaterThanOrEqual(box.top)
    await expect(heading.bottom).toBeLessThanOrEqual(box.bottom)

    const end = within(surface).getByRole('link', { name: 'この番組名で検索' })

    await expect(end.getBoundingClientRect().top).toBeGreaterThan(box.bottom)

    reading!.scrollTop = reading!.scrollHeight

    await expect(reading!.scrollTop).toBeGreaterThan(0)
    await expect(end.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      box.bottom,
    )
    await expect(title.getBoundingClientRect().top).toBeCloseTo(heading.top, 0)
    await expect(surface.getBoundingClientRect().height).toBeCloseTo(
      box.height,
      0,
    )
  },
}

export const 短い本文では内容ぶんの高さ: Story = {
  args: { program: bare, channel: channelOf(bare.channelId) },
  parameters: { screen: A_SHORT_WINDOW },
  play: async ({ canvasElement }) => {
    const surface = await opened(canvasElement)
    const view = canvasElement.ownerDocument.defaultView!

    await expect(view.innerHeight).toBe(A_SHORT_WINDOW.height)
    await expect(surface.getBoundingClientRect().height).toBeLessThan(
      view.innerHeight * AT_MOST_DOWN,
    )
  },
}
