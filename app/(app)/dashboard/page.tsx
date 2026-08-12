import type { Metadata } from 'next'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { dataSource } from '@/lib/dataSource'
import { listUsers, type UserStatus } from '@/repository/usersRepository'

export const metadata: Metadata = { title: 'Dashboard' }

const STAT_ACCENT: Record<string, string> = {
  Active: 'text-success',
  Invited: 'text-info',
  Suspended: 'text-warning',
}

export default async function DashboardPage() {
  // Counts computed through the same repository / data-source seam as /users.
  const all = await listUsers(dataSource, { page: 1, perPage: 1000 })
  const count = (status: UserStatus) =>
    all.items.filter((u) => u.status === status).length

  const stats = [
    { label: 'Total users', value: all.total },
    { label: 'Active', value: count('active') },
    { label: 'Invited', value: count('invited') },
    { label: 'Suspended', value: count('suspended') },
  ]

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle
                className={`text-3xl ${STAT_ACCENT[stat.label] ?? ''}`}
              >
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
            This dashboard, the Users table, and Settings all live inside the
            shared AppShell. Open the Users page to see the generic DataTable
            wired through the repository and in-memory data source.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
