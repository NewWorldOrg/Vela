import { useState, type ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import { CHANNEL_FIXTURES } from '@/repository/channels.fixtures'
import type { ReservationWrite } from '@/repository/reservations'
import { Button } from '@/components/ui/button'
import {
  PROGRAM_DAY,
  PROGRAM_DETAIL_FIXTURES,
  PROGRAM_FIXTURES,
} from '@/repository/programs.fixtures'
import { ProgramPanel } from '@/components/guide/program-panel'

const idle = PROGRAM_FIXTURES.find((p) => p.subtitled && p.description)!
const booked = PROGRAM_FIXTURES.find((p) => p.booking)!
const multiline = PROGRAM_DETAIL_FIXTURES.multiline.program

const channelOf = (channelId: string) =>
  CHANNEL_FIXTURES.find((channel) => channel.id === channelId)

const meta = {
  title: 'Components/ProgramPanel',
  component: ProgramPanel,
  parameters: { layout: 'fullscreen' },
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

export const 通常: Story = {
  args: { program: idle, channel: channelOf(idle.channelId) },
}

export const 予約済み: Story = {
  args: { program: booked, channel: channelOf(booked.channelId) },
}

export const 改行を含む本文: Story = {
  args: { program: multiline, channel: channelOf(multiline.channelId) },
}

export const 閉じた状態: Story = {
  args: { program: idle, channel: channelOf(idle.channelId), open: false },
}

const showing: Story['args'] = {
  program: idle,
  channel: channelOf(idle.channelId),
}

/** The panel takes focus once it is open, which is also when it starts listening. */
const showed = (canvasElement: HTMLElement) =>
  waitFor(() => expect(canvasElement.querySelector('aside')).toHaveFocus())

export const 範囲外を押すと閉じる: Story = {
  args: showing,
  play: async ({ args, canvasElement }) => {
    await showed(canvasElement)
    await userEvent.click(document.body)
    await waitFor(() => expect(args.onClose).toHaveBeenCalled())
  },
}

export const 中を押しても閉じない: Story = {
  args: showing,
  play: async ({ args, canvasElement }) => {
    await showed(canvasElement)
    await userEvent.click(within(canvasElement).getByText(idle.title))
    await expect(args.onClose).not.toHaveBeenCalled()
  },
}

export const Escで閉じる: Story = {
  args: showing,
  play: async ({ args, canvasElement }) => {
    await showed(canvasElement)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(args.onClose).toHaveBeenCalled())
  },
}

export const 別の番組を押しても閉じない: Story = {
  args: showing,
  render: (args) => (
    <>
      <Button data-opens="program-panel">別の番組</Button>
      <ProgramPanel {...args} />
    </>
  ),
  play: async ({ args, canvasElement }) => {
    await showed(canvasElement)
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: '別の番組' }),
    )
    await expect(args.onClose).not.toHaveBeenCalled()
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
    await showed(canvasElement)

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(opener).toHaveFocus())
  },
}
