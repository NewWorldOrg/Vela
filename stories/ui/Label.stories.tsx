import type { Meta, StoryObj } from '@storybook/nextjs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

const meta = {
  title: 'UI/Label',
  component: Label,
  parameters: { layout: 'centered' },
  args: { children: 'Email' },
} satisfies Meta<typeof Label>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ForControl: Story = {
  render: (args) => (
    <div className="grid w-72 gap-2">
      <Label {...args} htmlFor="email-field">
        Email
      </Label>
      <Input id="email-field" type="email" placeholder="you@example.com" />
    </div>
  ),
}
