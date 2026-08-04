import type { Metadata } from 'next'
import UsersListPage from '@/components/page-component/UsersListPage'
import { dataSource } from '@/lib/dataSource'
import { listUsers } from '@/repository/usersRepository'
import type { SortDirection } from '@/types/dataTable'

export const metadata: Metadata = { title: 'Users' }

const DEFAULT_PER_PAGE = 20

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/**
 * Server Component: reads list state from the URL, fetches the first page
 * through the repository (mock data source), and hands it to the client
 * page-component. Demonstrates app → page-component → table → repository →
 * data source end to end.
 */
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const pageRaw = firstValue(sp.page)
  const page = pageRaw && /^[1-9]\d*$/.test(pageRaw) ? Number(pageRaw) : 1
  const sortKey = firstValue(sp.sort) ?? 'name'
  const sortDirection: SortDirection =
    firstValue(sp.dir) === 'desc' ? 'desc' : 'asc'
  const name = firstValue(sp.name)

  const initialData = await listUsers(dataSource, {
    page,
    perPage: DEFAULT_PER_PAGE,
    sort: { sortKey, sortDirection },
    filters: name ? { name } : undefined,
  })

  return <UsersListPage initialData={initialData} />
}
