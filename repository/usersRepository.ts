import type { DataSource, ListQuery, Page } from '@/lib/data-source'

export type UserRole = 'Admin' | 'Editor' | 'Viewer'
export type UserStatus = 'active' | 'invited' | 'suspended'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  createdAt: string
}

const COLLECTION = 'users'

/**
 * Typed repository functions. They take a `DataSource` (the seam) rather than
 * talking to a transport directly, so the same functions work against the
 * in-memory mock today and a real API/DB later.
 */
export function listUsers(
  dataSource: DataSource,
  query: ListQuery,
): Promise<Page<User>> {
  return dataSource.list<User>(COLLECTION, query)
}

export function getUser(
  dataSource: DataSource,
  id: string,
): Promise<User | null> {
  return dataSource.find<User>(COLLECTION, id)
}
