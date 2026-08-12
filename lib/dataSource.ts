import { createInMemoryDataSource } from '@/lib/data-source'
import { userSeed } from '@/repository/usersSeed'

/**
 * The application's data source — the single place to swap the seam's
 * implementation. To move off the in-memory mock, replace this construction
 * with an http/db `DataSource`; repositories and UI need no changes.
 */
export const dataSource = createInMemoryDataSource({
  users: { idField: 'id', records: userSeed },
})
