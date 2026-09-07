import type { LiveProfile } from '@/repository/live'

export function unaskedIn(profiles: LiveProfile[]): string | undefined {
  return (profiles.find((one) => one.unasked) ?? profiles[0])?.name
}
