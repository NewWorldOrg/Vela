import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, within } from 'storybook/test'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

const meta = {
  title: 'UI/Checkbox',
  component: Checkbox,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
  // Verifies label association (clicking the label toggles the box) and toggle.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const checkbox = canvas.getByRole('checkbox', {
      name: 'Accept terms and conditions',
    })
    await expect(checkbox).not.toBeChecked()
    await userEvent.click(canvas.getByText('Accept terms and conditions'))
    await expect(checkbox).toBeChecked()
  },
}

export const Checked: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="subscribed" defaultChecked />
      <Label htmlFor="subscribed">Subscribed</Label>
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="disabled" disabled />
      <Label htmlFor="disabled">Disabled</Label>
    </div>
  ),
}
