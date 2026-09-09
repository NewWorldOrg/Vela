import type { OriginLabel } from '@/lib/format'
import { formatDateTime, formatReservationOrigin } from '@/lib/format'
import type { OutcomeChoice } from '@/lib/reservation-outcomes'
import { OUTCOME_KINDS, OUTCOME_SPANS } from '@/lib/reservation-outcomes'
import { shapeFor } from '@/lib/not-yet-in-this-build'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import { toInt } from '@/repository/programmes'
import type { GuideChannel } from '@/repository/programs'
import { fetchServiceChannels } from '@/repository/programs'
import { listReservations } from '@/repository/reservations'
import { ruleNames } from '@/repository/rules'
import type { FailureClass } from '@/repository/scan-failures'
import {
  INCOMPLETE_TABLES,
  LOCKED_WITHOUT_DATA,
  NO_LOCK,
  UNEXPECTED_STREAM,
} from '@/repository/scan-failures'
import { whatItSaid } from '@/repository/said'

type OutcomeResponder = components['schemas']['ReservationOutcomeResponder']

export type ReservationOutcomeKind =
  components['schemas']['ReservationOutcomeKind']

type TuneFailure = NonNullable<components['schemas']['TuneFailureKind']>

export type RecordingResult = NonNullable<
  components['schemas']['RecordingOutcome']
>

export interface RecordedInstead {
  key: string
  title?: string
  meta?: string
}

export interface ReservationOutcome {
  id: string
  title: string
  channelName: string
  channelNo?: string
  whenLabel: string
  origin: OriginLabel
  ruleName?: string
  priority: number
  kind: ReservationOutcomeKind
  tuneFailure?: FailureClass
  recordingResult?: RecordingResult
  instead: RecordedInstead[]
  occurredLabel: string
}

export interface OutcomeLedgerFilter {
  kind?: ReservationOutcomeKind
  days?: string
  ch?: string
  rule?: string
}

export interface OutcomeLedgerAsking extends OutcomeLedgerFilter {
  page?: number
}

export interface OutcomeLedgerResult {
  items: ReservationOutcome[]
  total: number
  page: number
  lastPage: number
  filter: OutcomeLedgerFilter
  channels: OutcomeChoice[]
  rules: OutcomeChoice[]
}

const PER_PAGE = 50

const A_DAY = 24 * 60 * 60 * 1000

const UNREADABLE = '予約結果を読めませんでした'

const TUNE_FAILURES: Record<TuneFailure, FailureClass> = {
  noLock: NO_LOCK,
  noData: LOCKED_WITHOUT_DATA,
  incompletePsi: INCOMPLETE_TABLES,
  streamMismatch: UNEXPECTED_STREAM,
}

export async function listReservationOutcomes(
  asked: OutcomeLedgerAsking = {},
  now: Date = new Date(),
): Promise<OutcomeLedgerResult> {
  const [known, rules] = await Promise.all([
    fetchServiceChannels(),
    ruleNames(),
  ])
  const filter = readFilter(asked, known, rules)
  const page = asked.page && asked.page >= 1 ? asked.page : 1
  const { data, error } = await carinaClient().GET(
    '/api/reservations/outcomes',
    {
      params: {
        query: {
          page,
          perPage: PER_PAGE,
          kind: filter.kind ? [filter.kind] : undefined,
          channel: filter.ch ? [filter.ch] : undefined,
          rule: filter.rule,
          from: filter.days ? since(filter.days, now) : undefined,
        },
      },
    },
  )

  if (error || !data?.data) {
    throw new Error(whatItSaid(error, data) || UNREADABLE)
  }

  const found = data.data
  const named = await namesOfWhatWonInstead(found.items)

  return {
    items: found.items.map((one) => toOutcome(one, known, rules, named)),
    total: toInt(found.total),
    page: toInt(found.currentPage),
    lastPage: toInt(found.lastPage),
    filter,
    channels: known.map((one) => ({ value: one.id, label: one.name })),
    rules: [...rules].map(([value, label]) => ({ value, label })),
  }
}

function readFilter(
  asked: OutcomeLedgerAsking,
  known: GuideChannel[],
  rules: ReadonlyMap<string, string>,
): OutcomeLedgerFilter {
  return {
    kind: OUTCOME_KINDS.find((one) => one === asked.kind),
    days: OUTCOME_SPANS.find((one) => one.value === asked.days)?.value,
    ch: known.find((one) => one.id === asked.ch)?.id,
    rule: asked.rule && rules.has(asked.rule) ? asked.rule : undefined,
  }
}

function since(days: string, now: Date): string {
  return new Date(now.getTime() - Number(days) * A_DAY).toISOString()
}

async function namesOfWhatWonInstead(
  items: OutcomeResponder[],
): Promise<ReadonlyMap<string, RecordedInstead>> {
  const wanted = new Set(items.flatMap((one) => one.recordedInstead))

  if (wanted.size === 0) {
    return new Map()
  }

  const { items: reservations } = await listReservations({ show: 'all' })

  return new Map(
    reservations
      .filter((one) => wanted.has(one.id))
      .map((one) => [
        one.id,
        {
          key: one.id,
          title: one.title,
          meta: `${one.channelName} · ${one.whenLabel}`,
        },
      ]),
  )
}

function toOutcome(
  one: OutcomeResponder,
  known: GuideChannel[],
  rules: ReadonlyMap<string, string>,
  named: ReadonlyMap<string, RecordedInstead>,
): ReservationOutcome {
  const channel = known.find((each) => each.id === serviceKeyOf(one))

  return {
    id: one.id,
    title: one.programme.name,
    channelName: channel?.name || serviceKeyOf(one),
    channelNo: channel?.no,
    whenLabel: formatDateTime(one.programme.startsAt),
    origin: formatReservationOrigin(one.ruleId ? 'byRule' : 'byHand'),
    ruleName: one.ruleId ? rules.get(one.ruleId) : undefined,
    priority: toInt(one.priority),
    kind: one.kind,
    tuneFailure: one.tuneFailure
      ? shapeFor(TUNE_FAILURES, one.tuneFailure, undefined)
      : undefined,
    recordingResult: one.recordingOutcome ?? undefined,
    instead: one.recordedInstead.map((id) => named.get(id) ?? { key: id }),
    occurredLabel: formatDateTime(one.occurredAt),
  }
}

function serviceKeyOf(one: OutcomeResponder): string {
  return `${toInt(one.programme.networkId)}-${toInt(one.programme.serviceId)}`
}
