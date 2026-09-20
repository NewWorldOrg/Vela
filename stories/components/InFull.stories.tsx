import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, within } from 'storybook/test'

import { Tile } from '@/components/vela/surface'
import { InFull } from '@/components/vela/in-full'

const meta = {
  title: 'Components/InFull',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const WHOLE =
  '夜どおし特集「灯台のある町から ― 半世紀ぶんの記録をたずねて、港ではたらく人びとと海の道をたどる長い夜」'

export const 見切れた文章: Story = {
  render: () => (
    <div className="max-w-[320px] p-6">
      <InFull says={WHOLE}>
        <span className="block truncate text-ui">{WHOLE}</span>
      </InFull>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const clipped = canvas.getByText(WHOLE)

    await expect(clipped).toHaveAttribute('tabindex', '0')

    await userEvent.tab()

    await expect(clipped).toHaveFocus()
    await expect(await screen.findByRole('tooltip')).toHaveTextContent(WHOLE)
  },
}

export const すでに押せるもの: Story = {
  render: () => (
    <div className="max-w-[320px] p-6">
      <InFull says={WHOLE} alreadyFocusable>
        <Tile className="w-full">
          <span className="block truncate text-ui">{WHOLE}</span>
        </Tile>
      </InFull>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const tile = canvas.getByRole('button')

    await expect(tile).not.toHaveAttribute('tabindex')
    await expect(canvas.getByText(WHOLE)).not.toHaveAttribute('tabindex')

    await userEvent.tab()

    await expect(tile).toHaveFocus()
    await expect(await screen.findByRole('tooltip')).toHaveTextContent(WHOLE)
  },
}
