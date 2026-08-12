import type { Meta, StoryObj } from '@storybook/nextjs'
import { Badge } from '@/components/ui/badge'

const meta = {
  title: 'UI/Badge',
  component: Badge,
  parameters: { layout: 'centered' },
  args: { children: 'Badge' },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge {...args} variant="default">
        Default
      </Badge>
      <Badge {...args} variant="secondary">
        Secondary
      </Badge>
      <Badge {...args} variant="destructive">
        Destructive
      </Badge>
      <Badge {...args} variant="outline">
        Outline
      </Badge>
    </div>
  ),
}

/**
 * Demonstrates the extended status tokens (success / warning / info) available
 * as Tailwind utilities, applied via className without a dedicated variant.
 */
export const StatusColors: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge className="border-transparent bg-success text-success-foreground">
        Success
      </Badge>
      <Badge className="border-transparent bg-warning text-warning-foreground">
        Warning
      </Badge>
      <Badge className="border-transparent bg-info text-info-foreground">
        Info
      </Badge>
    </div>
  ),
}
