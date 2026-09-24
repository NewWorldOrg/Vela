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

export const 素の文字列: Story = {
  render: () => (
    <div className="max-w-[320px] p-6">
      <InFull says={WHOLE}>{WHOLE}</InFull>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const held = canvas.getByText(WHOLE)

    await expect(held).toBeVisible()
    await expect(held).toHaveAttribute('tabindex', '0')

    await userEvent.tab()

    await expect(held).toHaveFocus()
    await expect(await screen.findByRole('tooltip')).toHaveTextContent(WHOLE)
  },
}

export const 自分で包む: Story = {
  render: () => (
    <div className="p-6">
      <InFull says="保存先の場所" wraps="inline-block">
        Shelf
      </InFull>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const trigger = canvasElement.querySelector<HTMLElement>(
      '[data-slot="tooltip-trigger"]',
    )

    await expect(trigger).not.toBeNull()
    await expect(trigger!.tagName).toBe('SPAN')
    await expect(trigger!.className).toContain('inline-block')
    await expect(trigger!.className).toContain('cursor-help')
    await expect(trigger!.tabIndex).toBe(0)
    await expect(trigger!.children).toHaveLength(0)
    await expect(trigger).toHaveTextContent('Shelf')
  },
}
