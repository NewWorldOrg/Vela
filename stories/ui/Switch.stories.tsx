import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, within } from 'storybook/test'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

const meta = {
  title: 'UI/Switch',
  component: Switch,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="airplane" />
      <Label htmlFor="airplane">Airplane mode</Label>
    </div>
  ),
  // Verifies the switch role, label association, and toggle interaction.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const toggle = canvas.getByRole('switch', { name: 'Airplane mode' })
    await expect(toggle).not.toBeChecked()
    await userEvent.click(toggle)
    await expect(toggle).toBeChecked()
  },
}

export const Checked: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="wifi" defaultChecked />
      <Label htmlFor="wifi">Wi-Fi</Label>
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="bluetooth" disabled />
      <Label htmlFor="bluetooth">Bluetooth</Label>
    </div>
  ),
}
