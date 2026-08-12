import type { Meta, StoryObj } from '@storybook/nextjs'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

/**
 * The story is wrapped in the app ThemeProvider by the global preview
 * decorator, so the toggle is fully interactive here. Use the Storybook
 * toolbar "Theme" control to preview light vs. dark.
 */
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
