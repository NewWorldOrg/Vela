import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, fn, userEvent, within } from 'storybook/test'

import { PickToggle } from '@/components/library/picking'

const meta = {
  title: 'Components/ボタンとフォーム/選ぶボタン',
  component: PickToggle,
  parameters: { layout: 'centered' },
  args: { pressed: false, onPress: fn() },
} satisfies Meta<typeof PickToggle>

export default meta
type Story = StoryObj<typeof meta>

/** Both states side by side: the toggle as it rests, and as it stands while the list is choosing. */
function BothStates() {
  return (
    <div className="flex items-center gap-4">
      <PickToggle pressed={false} onPress={() => undefined} />
      <PickToggle pressed onPress={() => undefined} />
    </div>
  )
}

export const 押す前: Story = {}

export const 押された: Story = { args: { pressed: true } }

export const 押されたものは色で分かる: Story = {
  render: () => <BothStates />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [resting, pressed] = canvas.getAllByRole('button', { name: '選ぶ' })

    await expect(resting).toHaveAttribute('aria-pressed', 'false')
    await expect(pressed).toHaveAttribute('aria-pressed', 'true')

    const restingGround = getComputedStyle(resting).backgroundColor
    const pressedGround = getComputedStyle(pressed).backgroundColor
    const pressedInk = getComputedStyle(pressed).color

    await expect(pressedGround).not.toBe(restingGround)
    await expect(pressedInk).not.toBe(getComputedStyle(resting).color)

    await userEvent.hover(pressed)
    await expect(getComputedStyle(pressed).backgroundColor).toBe(pressedGround)
    await expect(getComputedStyle(pressed).color).toBe(pressedInk)

    await userEvent.hover(resting)
    await expect(getComputedStyle(resting).backgroundColor).not.toBe(
      pressedGround,
    )
  },
}
