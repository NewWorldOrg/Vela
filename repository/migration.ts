import type { Route } from 'next'

import { formatDateTime, formatSpanToTheMillisecond } from '@/lib/format'
import {
  NOT_YET_IN_THIS_BUILD,
  NOT_YET_IN_THIS_BUILD_SAYING,
  shapeFor,
  wordFor,
} from '@/lib/not-yet-in-this-build'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import { toInt } from '@/repository/programmes'
import { grouped } from '@/repository/recordings'
import { whatItSaid } from '@/repository/said'

type RecordResponder = components['schemas']['MigrationRecordResponder']
type RunResponder = components['schemas']['MigrationRunResponder']
type PopulationResponder = components['schemas']['MigrationPopulationResponder']
type RefusalResponder = components['schemas']['MigrationRefusalResponder']
type LossResponder = components['schemas']['MigrationLossResponder']
type DetailResponder = components['schemas']['MigrationDetailResponder']
type Population = components['schemas']['MigrationPopulation']
type Refusal = components['schemas']['MigrationRefusal']
type LossSubject = components['schemas']['MigrationLossSubject']

export interface MigrationRun {
  heading: string
  kind: string
  rehearsals: string
  startedAt: string
  finishedAt: string
  duration: string
  source: string
  lastRehearsal: string
}

export interface MigrationPopulationRow {
  name: string
  source: string
  total: string
  unit: string
  taken: string
  notTaken: string
  unclassified: string
  link?: { href: Route; label: string }
}

export interface MigrationNotTakenRow {
  id: string
  subject: string
  population: string
  fact: string
}

export interface MigrationNotTakenGroup {
  name: string
  count: string
  unit: string
  rows: MigrationNotTakenRow[]
  empty?: string
}

export interface MigrationLoss {
  id: string
  subject: string
  fact: string
}

export interface MigrationResult {
  run: MigrationRun
  populations: MigrationPopulationRow[]
  unclassified: string
  notTakenGroups: MigrationNotTakenGroup[]
  losses: MigrationLoss[]
}

const UNREADABLE = '移行記録を読めませんでした'

const MOST_PER_PAGE = 500

const NOTHING_IN_THIS_GROUP = '該当なし'

const NO_REHEARSAL = '—'

const NOTHING_WAS_MEASURED = '—'

interface PopulationShape {
  name: string
  source: string
  unit: string
  link?: { href: Route; label: string }
}

const POPULATION_SHAPES: Record<Population, PopulationShape> = {
  recordings: {
    name: '録画',
    source: 'recorded',
    unit: '本',
    link: { href: '/library', label: 'ライブラリへ' },
  },
  recordingFiles: {
    name: '録画ファイル',
    source: 'video_file + 出力ディレクトリ',
    unit: '件',
  },
  rules: {
    name: 'ルール',
    source: 'rule',
    unit: '件',
    link: { href: '/reservations/rules', label: 'ルール一覧へ' },
  },
  reservations: { name: '予約', source: 'reserve', unit: '件' },
  channelDefinitions: { name: 'チャンネル定義', source: 'channel', unit: '件' },
  programmeGuide: { name: '番組表', source: 'program', unit: '行' },
}

const POPULATION_NOT_YET_SHAPED: PopulationShape = {
  name: NOT_YET_IN_THIS_BUILD,
  source: '—',
  unit: '件',
}

const REFUSAL_LABEL: Record<Refusal, string> = {
  reallyEmpty: '実 0 バイト',
  fileMissing: 'ファイル不在',
  orphan: '孤児',
  unidentifiable: '同定不能',
  inexpressible: '型として表現不能',
  noSuchFeature: '本システムに機能が無い',
  outOfScope: '対象外',
}

const SOURCE_SAYINGS: [RegExp, string][] = [
  [/^the recording system being replaced$/i, '現行の録画システム'],
]

const SOURCE_NOT_SAID = '名前を引けない移行元'

interface LossShape {
  subject: string
  fact: (affected: string) => string
}

const LOSS_SHAPES: Record<LossSubject, LossShape> = {
  duplicateAvoidance: {
    subject: 'ルールの重複録画防止',
    fact: (affected) => `運んだ ${affected} 件のルールがこの設定を失った`,
  },
  enclosedCharacters: {
    subject: '番組名の囲み文字',
    fact: (affected) => `運んだ ${affected} 本の題名が元の文字に戻せない`,
  },
  dayBoundary: {
    subject: '曜日で絞ったルール',
    fact: (affected) =>
      `運んだ ${affected} 件のルールで、深夜 0 時から 4 時の番組の曜日が 1 日ずれる`,
  },
}

const LOSS_NOT_YET_SHAPED: LossShape = {
  subject: NOT_YET_IN_THIS_BUILD,
  fact: () => NOT_YET_IN_THIS_BUILD_SAYING,
}

export async function getMigration(): Promise<MigrationResult | null> {
  const record = await fetchEveryDetail()

  if (!record.run) {
    return null
  }

  return {
    run: toRun(record.run),
    populations: record.populations.map(toPopulation),
    unclassified: grouped(toInt(record.unclassified)),
    notTakenGroups: record.refusals.map((refusal) =>
      toGroup(refusal, record.items),
    ),
    losses: record.losses.map(toLoss),
  }
}

export async function hasMigrationRecord(): Promise<boolean> {
  return (await fetchPage(1, 1)).run !== null
}

async function fetchEveryDetail(): Promise<RecordResponder> {
  const first = await fetchPage(1, MOST_PER_PAGE)
  const items = [...first.items]
  const lastPage = toInt(first.lastPage)

  for (let page = 2; page <= lastPage; page += 1) {
    const next = await fetchPage(page, MOST_PER_PAGE)

    items.push(...next.items)
  }

  return { ...first, items }
}

async function fetchPage(
  page: number,
  perPage: number,
): Promise<RecordResponder> {
  const { data, error } = await carinaClient().GET('/api/migration/record', {
    params: { query: { page, perPage } },
  })

  if (error || !data?.data) {
    throw new Error(whatItSaid(error, data) || UNREADABLE)
  }

  return data.data
}

function toRun(run: RunResponder): MigrationRun {
  const rehearsals = toInt(run.rehearsals)

  return {
    heading: `${formatDateTime(run.startedAt)} の実行`,
    kind: run.pass === 'forReal' ? '本番' : '下見',
    rehearsals: rehearsals === 0 ? '下見なし' : `下見 ${rehearsals} 回`,
    startedAt: formatDateTime(run.startedAt),
    finishedAt: formatDateTime(run.finishedAt),
    duration: `所要 ${formatSpanToTheMillisecond(millisecondsBetween(run.startedAt, run.finishedAt))}`,
    source: whatItCameFrom(run.source),
    lastRehearsal: run.lastRehearsalFinishedAt
      ? formatDateTime(run.lastRehearsalFinishedAt)
      : NO_REHEARSAL,
  }
}

function whatItCameFrom(source: string): string {
  const saying = SOURCE_SAYINGS.find(([reads]) => reads.test(source))

  return saying ? saying[1] : SOURCE_NOT_SAID
}

function millisecondsBetween(from: string, until: string): number {
  return Math.max(0, new Date(until).getTime() - new Date(from).getTime())
}

function toPopulation(one: PopulationResponder): MigrationPopulationRow {
  const shape = shapeFor(
    POPULATION_SHAPES,
    one.population,
    POPULATION_NOT_YET_SHAPED,
  )

  return {
    name: shape.name,
    source: shape.source,
    unit: shape.unit,
    total: grouped(toInt(one.offered)),
    taken: grouped(toInt(one.carried)),
    notTaken: grouped(toInt(one.notCarried)),
    unclassified: grouped(toInt(one.unclassified)),
    link: shape.link,
  }
}

function toGroup(
  one: RefusalResponder,
  items: DetailResponder[],
): MigrationNotTakenGroup {
  const rows = items.filter((item) => item.refusal === one.refusal)

  return {
    name: wordFor(REFUSAL_LABEL, one.refusal),
    count: grouped(toInt(one.count)),
    unit: '件',
    rows: rows.map(toDetail),
    empty: rows.length === 0 ? NOTHING_IN_THIS_GROUP : undefined,
  }
}

function toDetail(one: DetailResponder): MigrationNotTakenRow {
  return {
    id: one.id,
    subject: one.note,
    population: shapeFor(
      POPULATION_SHAPES,
      one.population,
      POPULATION_NOT_YET_SHAPED,
    ).name,
    fact: sizeOf(one) ?? NOTHING_WAS_MEASURED,
  }
}

function sizeOf(one: DetailResponder): string | undefined {
  const claimed = counted(one.claimed)
  const observed = counted(one.observed)

  if (observed !== undefined && claimed !== undefined) {
    return `${grouped(observed)} B(記録上 ${grouped(claimed)} B)`
  }

  if (observed !== undefined) {
    return `${grouped(observed)} B`
  }

  return claimed === undefined ? undefined : `記録上 ${grouped(claimed)} B`
}

function counted(value: number | string | null): number | undefined {
  return value == null ? undefined : toInt(value)
}

function toLoss(one: LossResponder): MigrationLoss {
  const shape = shapeFor(LOSS_SHAPES, one.subject, LOSS_NOT_YET_SHAPED)

  return {
    id: one.subject,
    subject: shape.subject,
    fact: shape.fact(grouped(toInt(one.affected))),
  }
}
