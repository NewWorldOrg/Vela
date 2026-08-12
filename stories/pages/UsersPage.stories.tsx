import type { Meta, StoryObj } from '@storybook/nextjs'
import AppShell from '@/components/layout/AppShell'
import UsersListPage from '@/components/page-component/UsersListPage'
import { userSeed } from '@/repository/usersSeed'
import type { Page } from '@/lib/data-source'
import type { User } from '@/repository/usersRepository'

const initialData: Page<User> = {
  items: userSeed.slice(0, 20),
  total: userSeed.length,
  page: 1,
  perPage: 20,
  lastPage: Math.ceil(userSeed.length / 20),
}

/**
 * The full Users list screen as it renders in the app: AppShell + the
 * page-component + the generic DataTable, fed from the seed data.
 */
const meta = {
  title: 'Pages/Users',
  component: UsersListPage,
  parameters: {
    layout: 'fullscreen',
    nextjs: { navigation: { pathname: '/users' } },
  },
  args: { initialData },
} satisfies Meta<typeof UsersListPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <AppShell>
      <UsersListPage initialData={initialData} />
    </AppShell>
  ),
}
