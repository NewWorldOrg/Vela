import type { Meta, StoryObj } from '@storybook/nextjs'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

const meta = {
  title: 'Theme/ThemeToggle',
  component: ThemeToggle,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof ThemeToggle>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Outline: Story = {
  args: { variant: 'outline' },
}
