import type { Programme } from '@/repository/programmes'
import { searchProgrammes } from '@/repository/programmes'
import type { Genre, GuideChannel } from '@/repository/programs'
import {
  calendarDateOf,
  clockLabel,
  dayLabel,
  fetchServiceChannels,
  genreDisplayOf,
  windowStartOf,
} from '@/repository/programs'

export type SearchSort = 'start_at.asc' | 'start_at.desc' | 'name.asc'

export const SEARCH_SORT_OPTIONS: { value: SearchSort; label: string }[] = [
  { value: 'start_at.asc', label: '放送日時が早い順' },
  { value: 'start_at.desc', label: '放送日時が遅い順' },
  { value: 'name.asc', label: '番組名順' },
]

export const SEARCH_PER_PAGE_OPTIONS = [20, 50, 100]

export const SEARCH_DEFAULT_SORT: SearchSort = 'start_at.asc'

export const SEARCH_DEFAULT_PER_PAGE = 20

export interface RawSearchCondition {
  q?: string
  from?: string
  to?: string
  sort?: string
  perPage?: string
  page?: string
}

export interface SearchCondition {
  q?: string
  /** 放送日(JST 4:00 区切り)。`YYYY-MM-DD` */
  from?: string
  to?: string
  sort: SearchSort
  perPage: number
  page: number
}

export interface SearchHit {
  id: string
  channelName: string
  channelNo?: string
  dayLabel: string
  startLabel: string
  endLabel?: string
  endUndecided: boolean
  title: string
  description?: string
  genre: Genre
  genreLabel: string
  /** 予約・ルールのドメインが埋める枠。いまは何も設定しない */
  booked?: boolean
}

export interface SearchHits {
  hits: SearchHit[]
  total: number
  page: number
  lastPage: number
  perPage: number
  rangeFrom: number
  rangeTo: number
}

export type SearchOutcome =
  | { state: 'idle' }
  | { state: 'refused'; message: string }
  | { state: 'searched'; found: SearchHits }

export interface SearchResult {
  condition: SearchCondition
  periodLabel?: string
  outcome: SearchOutcome
}

const GUARD_MESSAGE =
  'キーワードは2文字以上で指定してください。期間は開始日から終了日へ向かう最長 31 日の範囲で指定できます。'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const PAGE_PATTERN = /^[1-9]\d*$/

function parseCondition(raw: RawSearchCondition): SearchCondition {
  return {
    q: raw.q?.trim() || undefined,
    from: raw.from && DATE_PATTERN.test(raw.from) ? raw.from : undefined,
    to: raw.to && DATE_PATTERN.test(raw.to) ? raw.to : undefined,
    sort:
      SEARCH_SORT_OPTIONS.find((option) => option.value === raw.sort)?.value ??
      SEARCH_DEFAULT_SORT,
    perPage:
      SEARCH_PER_PAGE_OPTIONS.find((count) => String(count) === raw.perPage) ??
      SEARCH_DEFAULT_PER_PAGE,
    page: raw.page && PAGE_PATTERN.test(raw.page) ? Number(raw.page) : 1,
  }
}

function periodLabelOf(condition: SearchCondition): string | undefined {
  if (condition.from && condition.to) {
    return `${dayLabel(condition.from)} 〜 ${dayLabel(condition.to)}`
  }

  if (condition.from) {
    return `${dayLabel(condition.from)} 〜`
  }

  if (condition.to) {
    return `〜 ${dayLabel(condition.to)}`
  }

  return undefined
}

function dayEndOf(date: string): Date {
  return new Date(windowStartOf(date).getTime() + 24 * 60 * 60 * 1000)
}

function toHit(programme: Programme, channels: GuideChannel[]): SearchHit {
  const channelId = `${programme.networkId}-${programme.serviceId}`
  const channel = channels.find((c) => c.id === channelId)
  const startsAt = new Date(programme.startsAt)
  const genre = genreDisplayOf(programme)

  return {
    id: programme.id,
    channelName: channel?.name || channelId,
    channelNo: channel?.no,
    dayLabel: dayLabel(calendarDateOf(startsAt)),
    startLabel: clockLabel(startsAt),
    endLabel: programme.endsAt
      ? clockLabel(new Date(programme.endsAt))
      : undefined,
    endUndecided: !programme.endsAt,
    title: programme.name,
    description: programme.summary || undefined,
    genre: genre.slug,
    genreLabel: genre.label,
  }
}

export async function searchPrograms(
  raw: RawSearchCondition,
): Promise<SearchResult> {
  const condition = parseCondition(raw)
  const periodLabel = periodLabelOf(condition)

  if (!condition.q) {
    return { condition, periodLabel, outcome: { state: 'idle' } }
  }

  const [search, channels] = await Promise.all([
    searchProgrammes({
      keyword: condition.q,
      from: condition.from ? windowStartOf(condition.from) : undefined,
      to: condition.to ? dayEndOf(condition.to) : undefined,
      sort: condition.sort === 'name.asc' ? 'name' : 'startsAt',
      descending: condition.sort === 'start_at.desc' ? true : undefined,
      page: condition.page,
      perPage: condition.perPage,
    }),
    fetchServiceChannels(),
  ])

  if (search.state === 'refused') {
    return {
      condition,
      periodLabel,
      outcome: { state: 'refused', message: GUARD_MESSAGE },
    }
  }

  const { page } = search

  return {
    condition,
    periodLabel,
    outcome: {
      state: 'searched',
      found: {
        hits: page.items.map((programme) => toHit(programme, channels)),
        total: page.total,
        page: page.currentPage,
        lastPage: page.lastPage,
        perPage: page.perPage,
        rangeFrom:
          page.total === 0 ? 0 : (page.currentPage - 1) * page.perPage + 1,
        rangeTo: Math.min(page.total, page.currentPage * page.perPage),
      },
    },
  }
}
