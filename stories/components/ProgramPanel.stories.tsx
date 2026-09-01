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

/**
 * A programme the broadcaster said nothing more about than its name and its
 * hour: no synopsis, no extended sections, nothing it is tied to. The surface
 * has to be readable drawn from that alone, and a story that only ever reads a
 * fully described programme never asks it.
 */
const bare = PROGRAM_DETAIL_FIXTURES.minimal.program

/** The same programme with a seat already held for it. */
const booked: Program = {
  ...standard,
  booked: true,
  booking: PROGRAM_FIXTURES.find((program) => program.booking)!.booking,
}

/** A synopsis long enough that the window, not the text, decides the height. */
const wordy: Program = {
  ...multiline,
  description: Array.from(
    { length: 14 },
    () => multiline.description ?? '',
  ).join('\n'),
}

const channelOf = (channelId: string) =>
  CHANNEL_FIXTURES.find((channel) => channel.id === channelId)

/**
 * Radix marks the page outside an open layer `aria-hidden` while what is under
 * it stays focusable, which is a fact about a page held open on purpose rather
 * than about what is inside the layer. The a11y context is narrowed to the
 * layer these stories are about.
 */
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

/**
 * The width the surface settles at once the window has room for it. SPEC set
 * the number for every dialog, and it is written out here rather than read back
 * off the component: a figure taken from what is being measured moves with it
 * and holds nothing.
 */
const AT_MOST_ACROSS = 672

/** What is left beside the surface once the window is narrower than that. */
const BESIDE_IT = 40

/** The share of the window's height the surface takes before it scrolls. */
const AT_MOST_DOWN = 0.85

const surfaceIn = (canvasElement: HTMLElement): HTMLElement | null =>
  canvasElement.ownerDocument.querySelector<HTMLElement>(
    '[data-slot="dialog-content"]',
  )

const overlayIn = (canvasElement: HTMLElement): HTMLElement | null =>
  canvasElement.ownerDocument.querySelector<HTMLElement>(
    '[data-slot="dialog-overlay"]',
  )

/** The surface, once it is up and has taken focus. */
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

/** The reading the layer and the programme's own page are both drawn from. */
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

/** The one row of the reading that every programme can answer. */
const subtitlesRowOf = (detail: HTMLElement): string | undefined =>
  detail.querySelector('dl dd')?.textContent ?? undefined

/**
 * What the surface is drawn showing, held against the programme it was given
 * rather than against the fact that something is up. A layer that opens empty
 * answers a test of the opening on its own.
 *
 * The reading itself is asked for, not a way to go and find it: the hour, the
 * service, what the broadcaster wrote, and every extended section the
 * programme carries. And the programme's own address is not among what is
 * drawn — reading a programme in the guide does not send the reader off the
 * guide — which is a claim about an absence, so it is only ever made in the
 * same breath as the reading being there.
 */
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

/**
 * Nothing beyond the name and the hour. Every part that draws itself from
 * something the broadcaster may not have sent is asked to leave no wreckage
 * behind when it did not: no empty synopsis, no headings with nothing under
 * them, and the one row that is always answerable answered.
 */
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

/**
 * A programme carried on more than one service. The other listing is reached
 * at its own address, which is the one place a programme still opens a page
 * from here — its own address is not, and both are asked for at once so that
 * neither is met by a surface that drew no links at all.
 */
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

/** A programme the broadcaster has not said the end of yet. */
export const 終了未定: Story = {
  args: { program: undecided, channel: channelOf(undecided.channelId) },
  play: async ({ canvasElement }) => {
    const surface = await opened(canvasElement)

    await reads(surface, undecided)

    const reading = wordsOf(detailIn(surface))

    await expect(reading).toContain('終了未定')
    await expect(reading).toContain('延長に追従して録画します')
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
    // The seat is held, so the way to take one is not offered a second time.
    await expect(shown.queryByRole('button', { name: '録画予約' })).toBeNull()
  },
}

export const 改行を含む本文: Story = {
  args: { program: multiline, channel: channelOf(multiline.channelId) },
  play: async ({ canvasElement }) => {
    await reads(await opened(canvasElement), multiline)
  },
}

/**
 * The layer and the programme's own page, up at once and drawn from the same
 * programme. What each of them reads has to be the same words in the same
 * order — not each of them separately right, which is what two copies of a
 * screen are while nobody holds them against each other.
 *
 * Both halves are asked for: the reading is held against the programme first,
 * so a pair that agree by both being empty does not answer.
 */
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

/**
 * Nothing on this surface is written into, so SPEC's exception for a half
 * filled form does not reach it and a press beside it means to leave.
 */
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

/** Whether the control that opens a programme heard the press aimed at it. */
const heard = fn()

/**
 * A press aimed at the control that opens a programme lands on the layer over
 * it instead, so the control never hears it. That is the whole of the change:
 * while a programme is open, the press that used to swap another one in behind
 * the reader closes what is open and stops there.
 */
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

    // Read out of the tree rather than by role: the page under an open layer is
    // `aria-hidden`, which is where a control this press must not reach lives.
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

/**
 * Editing a reservation puts a second surface over this one, and the one on
 * top answers alone. The form is written into, so SPEC holds it open through a
 * press outside; the programme underneath is covered, so the same press is not
 * its business either. Escape is answered by the top surface only, and the
 * programme is still there to go back to.
 */
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

    // A press beside both surfaces lands on the layer the form put over the
    // page, and neither surface takes it.
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

/** Opens and closes for real, so focus has somewhere to come back to. */
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

/**
 * The window a story is read at, moved for real rather than drawn as a box
 * inside a wider one: what the surface does at a width is decided against the
 * window, and a narrow box in a wide window answers as the wide window.
 */
const A_NARROW_WINDOW = { width: 460, height: 900 }

const A_WIDE_WINDOW = { width: 1680, height: 1000 }

const A_SHORT_WINDOW = { width: 1280, height: 560 }

/**
 * Across, the surface is a share of the window up to the width SPEC gives every
 * dialog, and that width from there on. Both ends are read off the same
 * expression, so neither is met by a surface that is simply one size.
 */
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

/**
 * Down, the window is the ceiling and the content is the floor. A programme
 * whose reading is longer than the window leaves the surface at the ceiling
 * with the reading scrolling inside it, and the title and the way out where
 * they were put.
 */
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

    const reading = surface.querySelector<HTMLElement>('[data-program-scroll]')

    await expect(reading).not.toBeNull()
    await expect(reading!.scrollHeight).toBeGreaterThan(reading!.clientHeight)

    const title = within(surface).getByRole('heading', { name: wordy.title })
    const heading = title.getBoundingClientRect()

    await expect(heading.top).toBeGreaterThanOrEqual(box.top)
    await expect(heading.bottom).toBeLessThanOrEqual(box.bottom)

    // The end of the reading is past the bottom of the surface to begin with,
    // and sending the surface's own reading down is what brings it inside. A
    // face that is merely cut off at the same place answers the first of those
    // and not the second: nothing moves, and the end stays out of reach.
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

/** A short programme in the same window: the content decides, not the ceiling. */
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
