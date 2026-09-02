import type { Route } from 'next'

import { MIGRATION } from '@/repository/migration.fixtures'

export interface MigrationPopulation {
  name: string
  source: string
  total: string
  unit: string
  taken: string
  notTaken: string
  unclassified: string
  link?: { href: Route; label: string }
  note?: string
}

export interface MigrationNotTakenRow {
  id: string
  target?: string
  file: string
  population: string
  fact: string
  link?: { href: Route; label: string }
}

export interface MigrationNotTakenGroup {
  name: string
  count: string
  unit: string
  rows: MigrationNotTakenRow[]
  empty?: string
}

export interface MigrationOmission {
  id: string
  tag: string
  title: string
  code?: string
  body: string
  count: string
  unit: string
}

export interface MigrationResult {
  run: {
    heading: string
    kind: string
    dryRuns: string
    startedAt: string
    finishedAt: string
    duration: string
    source: string
    dryRunNote: string
    output: string
  }
  populations: MigrationPopulation[]
  unclassified: string
  notTakenGroups: MigrationNotTakenGroup[]
  omissions: MigrationOmission[]
}

export async function getMigration(): Promise<MigrationResult | null> {
  return MIGRATION
}
