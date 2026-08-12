import type { Meta, StoryObj } from '@storybook/nextjs'
import AppShell from '@/components/layout/AppShell'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const stats = [
  { label: 'Total users', value: 42, accent: '' },
  { label: 'Active', value: 14, accent: 'text-success' },
  { label: 'Invited', value: 14, accent: 'text-info' },
  { label: 'Suspended', value: 14, accent: 'text-warning' },
]

/** The Dashboard screen: stat cards inside the AppShell. */
const meta = {
  title: 'Pages/Dashboard',
  parameters: {
    layout: 'fullscreen',
    nextjs: { navigation: { pathname: '/dashboard' } },
  },
} satisfies Meta

export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => (
    <AppShell>
      <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader>
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className={`text-3xl ${stat.accent}`}>
                  {stat.value}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Getting started</CardTitle>
            <CardDescription>
              The Dashboard, Users table, and Settings all live inside the
              shared AppShell.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </AppShell>
  ),
}
