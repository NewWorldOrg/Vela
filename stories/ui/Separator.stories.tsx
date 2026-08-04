import type { Meta, StoryObj } from '@storybook/nextjs'
import { Separator } from '@/components/ui/separator'

const meta = {
  title: 'UI/Separator',
  component: Separator,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Separator>

export default meta
type Story = StoryObj<typeof meta>

export const Horizontal: Story = {
  render: () => (
    <div className="w-64">
      <p className="text-sm font-medium">next-base</p>
      <p className="text-sm text-muted-foreground">A Next.js design base.</p>
      <Separator className="my-4" />
      <div className="flex h-5 items-center gap-4 text-sm">
        <span>Docs</span>
        <Separator orientation="vertical" />
        <span>Components</span>
        <Separator orientation="vertical" />
        <span>Storybook</span>
      </div>
    </div>
  ),
}
