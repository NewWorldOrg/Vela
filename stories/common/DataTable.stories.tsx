import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import type { ColumnDef } from '@tanstack/react-table'
import DataTable from '@/components/common/DataTable'
import { Badge } from '@/components/ui/badge'
import type { ColumnVisibilityOption } from '@/types/dataTable'

interface DemoRow {
  id: string
  name: string
  email: string
  role: string
  status: string
  team: string
  location: string
  createdAt: string
}

const NAMES = [
  'Avery Adams',
  'Blair Brooks',
  'Casey Cole',
  'Devon Diaz',
  'Emery Ellis',
  'Finley Frost',
]
const TEAMS = ['Platform', 'Growth', 'Design', 'Data']
const LOCATIONS = ['Tokyo', 'Berlin', 'Austin', 'Lisbon']
const STATUSES = ['active', 'invited', 'suspended']

const rows: DemoRow[] = Array.from({ length: 30 }, (_, i) => {
  const name = NAMES[i % NAMES.length]
  const [first, last] = name.toLowerCase().split(' ')
  return {
    id: String(i + 1),
    name: `${name} ${i + 1}`,
    email: `${first}.${last}${i + 1}@example.com`,
    role: ['Admin', 'Editor', 'Viewer'][i % 3],
    status: STATUSES[i % STATUSES.length],
    team: TEAMS[i % TEAMS.length],
    location: LOCATIONS[i % LOCATIONS.length],
    createdAt: `2026-0${(i % 9) + 1}-15`,
  }
})

const columns: ColumnDef<DemoRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    meta: { sticky: 'left', minWidthPx: 160 },
  },
  { accessorKey: 'email', header: 'Email', meta: { minWidthPx: 240 } },
  {
    accessorKey: 'role',
    header: 'Role',
    meta: { minWidthPx: 120, sortingField: 'role' },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => (
      <Badge variant="secondary">{String(getValue())}</Badge>
    ),
    meta: { minWidthPx: 130 },
  },
  { accessorKey: 'team', header: 'Team', meta: { minWidthPx: 140 } },
  { accessorKey: 'location', header: 'Location', meta: { minWidthPx: 160 } },
  { accessorKey: 'createdAt', header: 'Created', meta: { minWidthPx: 140 } },
]

const columnVisibilityOptions: ColumnVisibilityOption[] = [
  { id: 'name', label: 'Name', alwaysVisible: true },
  { id: 'email', label: 'Email' },
  { id: 'role', label: 'Role' },
  { id: 'status', label: 'Status' },
  { id: 'team', label: 'Team' },
  { id: 'location', label: 'Location' },
  { id: 'createdAt', label: 'Created' },
]

const meta = {
  title: 'Common/DataTable',
  component: DataTable,
  parameters: { layout: 'centered' },
  args: { data: rows, columns },
} satisfies Meta<typeof DataTable<DemoRow>>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="flex h-[440px] w-[760px] flex-col">
      <DataTable
        title="Users"
        data={rows}
        columns={columns}
        trackBy="id"
        columnVisibilityOptions={columnVisibilityOptions}
        storageKey="datatable-demo"
        pagination={{
          currentPage: 1,
          lastPage: 3,
          perPage: 20,
          total: rows.length,
        }}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const headerCell = canvas.getAllByRole('columnheader')[0]
    await expect(getComputedStyle(headerCell).position).toBe('sticky')

    const container = canvasElement.querySelector(
      '[data-slot="table-container"]',
    ) as HTMLElement
    await expect(container.scrollWidth).toBeGreaterThan(container.clientWidth)

    localStorage.removeItem('vela-column-visibility-datatable-demo')
    await userEvent.click(canvas.getByRole('button', { name: 'Columns' }))
    const emailToggle = await within(document.body).findByRole(
      'menuitemcheckbox',
      { name: 'Email' },
    )
    await userEvent.click(emailToggle)
    await expect(
      canvas.queryByRole('columnheader', { name: 'Email' }),
    ).toBeNull()
    await waitFor(() =>
      expect(
        localStorage.getItem('vela-column-visibility-datatable-demo'),
      ).toContain('email'),
    )

    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(canvasElement.closest('[aria-hidden="true"]')).toBeNull(),
    )
  },
}
