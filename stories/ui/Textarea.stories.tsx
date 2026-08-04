import type { Meta, StoryObj } from '@storybook/nextjs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

const meta = {
  title: 'UI/Textarea',
  component: Textarea,
  parameters: { layout: 'centered' },
  args: { placeholder: 'Type your message here.' },
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => <Textarea className="w-72" {...args} />,
}

export const WithLabel: Story = {
  render: (args) => (
    <div className="grid w-72 gap-2">
      <Label htmlFor="message">Message</Label>
      <Textarea id="message" {...args} />
    </div>
  ),
}

export const Disabled: Story = {
  render: (args) => <Textarea className="w-72" disabled {...args} />,
}
