import type { Meta, StoryObj } from '@storybook/nextjs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: { layout: 'centered' },
  args: { placeholder: 'Email' },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithLabel: Story = {
  render: (args) => (
    <div className="grid w-72 gap-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" {...args} />
    </div>
  ),
}

export const Disabled: Story = {
  args: { disabled: true },
}

export const Invalid: Story = {
  args: { 'aria-invalid': true, defaultValue: 'not-an-email' },
}
