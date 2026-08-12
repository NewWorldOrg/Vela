import type { User, UserRole, UserStatus } from '@/repository/usersRepository'

const FIRST = [
  'Avery',
  'Blair',
  'Casey',
  'Devon',
  'Emery',
  'Finley',
  'Gray',
  'Harper',
  'Indigo',
  'Jordan',
  'Kai',
  'Logan',
  'Marlow',
  'Noor',
  'Oakley',
  'Parker',
  'Quinn',
  'Reese',
  'Sage',
  'Tatum',
]
const LAST = [
  'Adams',
  'Brooks',
  'Cole',
  'Diaz',
  'Ellis',
  'Frost',
  'Greer',
  'Hayes',
  'Irwin',
  'Jain',
]
const ROLES: UserRole[] = ['Admin', 'Editor', 'Viewer']
const STATUSES: UserStatus[] = ['active', 'invited', 'suspended']

/**
 * Deterministic seed (no Date.now/Math.random) so list screens and stories are
 * stable. 42 users derived by index from fixed pools.
 */
export const userSeed: User[] = Array.from({ length: 42 }, (_, i) => {
  const first = FIRST[i % FIRST.length]
  const last = LAST[i % LAST.length]
  const day = String((i % 27) + 1).padStart(2, '0')
  const month = String((i % 12) + 1).padStart(2, '0')
  return {
    id: String(i + 1),
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
    role: ROLES[i % ROLES.length],
    status: STATUSES[i % STATUSES.length],
    createdAt: `2026-${month}-${day}`,
  }
})
