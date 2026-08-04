import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, within } from 'storybook/test'
import AppShell from '@/components/layout/AppShell'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const meta = {
  title: 'Layout/AppShell',
  component: AppShell,
  parameters: {
    layout: 'fullscreen',
    nextjs: { navigation: { pathname: '/dashboard' } },
  },
  args: { children: null },
} satisfies Meta<typeof AppShell>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <AppShell>
      <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {['Total', 'Active', 'Pending'].map((label) => (
            <Card key={label}>
              <CardHeader>
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-3xl">42</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Sidebar nav + header controls render.
    await expect(
      canvas.getByRole('link', { name: 'Dashboard' }),
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole('button', { name: 'Toggle sidebar' }),
    ).toBeInTheDocument()
    // The page title is shown in the header (not the content area).
    await expect(
      canvas.getByRole('heading', { name: 'Dashboard' }),
    ).toBeInTheDocument()
  },
}
