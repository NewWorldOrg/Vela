import type { Meta, StoryObj } from '@storybook/nextjs'
import { useState } from 'react'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { PlayerTip } from '@/components/recordings/player-tip'

const LONGER_THAN_A_NAME_WAITS = 900

/** A control of the player that opens a dialog, under its name, as the data broadcast's remote and the like do. */
function OpensADialog() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex gap-4 p-10">
      <Button variant="tone">前</Button>
      <PlayerTip name="リモコン">
        <Button variant="tone" onClick={() => setOpen(true)}>
          開く
        </Button>
      </PlayerTip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>リモコン</DialogTitle>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const meta = {
  title: 'Components/操作子の名札',
  component: OpensADialog,
} satisfies Meta<typeof OpensADialog>

export default meta
type Story = StoryObj<typeof meta>

function named(): HTMLElement | null {
  return document.querySelector('[data-slot="player-tip-name"]')
}

export const 対話を押して閉じて焦点が戻っても名札は出ない: Story = {
  play: async ({ canvasElement }) => {
    const opener = within(canvasElement).getByRole('button', { name: '開く' })

    await userEvent.click(opener)

    const dialog = await screen.findByRole('dialog', { name: 'リモコン' })

    await userEvent.click(
      within(dialog).getByRole('button', { name: '閉じる' }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(opener))
    await new Promise((done) => setTimeout(done, LONGER_THAN_A_NAME_WAITS))
    await expect(named()).toBeNull()
  },
}

export const Tabで焦点を移すと名札が出る: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    canvas.getByRole('button', { name: '前' }).focus()
    await userEvent.tab()
    await expect(document.activeElement).toBe(
      canvas.getByRole('button', { name: '開く' }),
    )
    await waitFor(() => expect(named()).toHaveTextContent('リモコン'), {
      timeout: 3000,
    })
  },
}
