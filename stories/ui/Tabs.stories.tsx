import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, within } from 'storybook/test'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-80">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account" className="text-sm text-muted-foreground">
        Make changes to your account here.
      </TabsContent>
      <TabsContent value="password" className="text-sm text-muted-foreground">
        Change your password here.
      </TabsContent>
    </Tabs>
  ),
  // Verifies tab roles, the initially-selected tab, and selection switching.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const account = canvas.getByRole('tab', { name: 'Account' })
    const password = canvas.getByRole('tab', { name: 'Password' })

    await expect(account).toHaveAttribute('aria-selected', 'true')
    await expect(password).toHaveAttribute('aria-selected', 'false')
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent(
      'Make changes to your account here.',
    )

    await userEvent.click(password)
    await expect(password).toHaveAttribute('aria-selected', 'true')
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent(
      'Change your password here.',
    )
  },
}
