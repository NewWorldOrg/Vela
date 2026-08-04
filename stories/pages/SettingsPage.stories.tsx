import type { Meta, StoryObj } from '@storybook/nextjs'
import AppShell from '@/components/layout/AppShell'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ExampleForm } from '@/components/forms/ExampleForm'

/** The Settings screen: an example form inside the AppShell. */
const meta = {
  title: 'Pages/Settings',
  parameters: {
    layout: 'fullscreen',
    nextjs: { navigation: { pathname: '/settings' } },
  },
} satisfies Meta

export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => (
    <AppShell>
      <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Update your public profile details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExampleForm />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  ),
}
