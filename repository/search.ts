import { windowStartOf } from '@/lib/guide'
import {
  genreKindsOf,
  narrowsAnything,
  readSearchCondition,
} from '@/lib/search-condition'
import type {
  RawSearchCondition,
  SearchCondition,
} from '@/lib/search-condition'
import type { ChannelKind } from '@/repository/channels'
import type { Programme, SearchQuery } from '@/repository/programmes'
import { searchProgrammes } from '@/repository/programmes'
import type { Genre, GuideChannel } from '@/repository/programs'
import {
  calendarDateOf,
  clockLabel,
  dayLabel,
  fetchServiceChannels,
  genreDisplayOf,
} from '@/repository/programs'

export type { RawSearchCondition, SearchCondition }

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
  /** 種別で絞ったあとの、チャンネル条件に出せるチャンネル */
  channels: GuideChannel[]
  outcome: SearchOutcome
}

const GUARD_MESSAGE =
  'キーワード・除外キーワードは、指定する場合は2文字以上にしてください。期間は開始日から終了日へ向かう最長 31 日の範囲で指定できます。'

const SYSTEM_OF_KIND: Record<ChannelKind, SearchQuery['system']> = {
  terrestrial: 'isdbT',
  bs: 'isdbSBs',
  cs110: 'isdbSCs110',
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
  const condition = readSearchCondition(raw)
  const carried = await fetchServiceChannels()
  const channels = [...carried]
    .filter((channel) => !condition.kind || channel.kind === condition.kind)
    .sort((left, right) => compareChannels(left, right))

  if (!narrowsAnything(condition)) {
    return { condition, channels, outcome: { state: 'idle' } }
  }

  const search = await searchProgrammes({
    keyword: condition.q,
    exclude: condition.exclude,
    fields:
      condition.fields === 'title,description' ? undefined : [condition.fields],
    genres: genreKindsOf(condition.genres),
    system: condition.kind ? SYSTEM_OF_KIND[condition.kind] : undefined,
    channels: condition.channels,
    from: condition.from ? windowStartOf(condition.from) : undefined,
    to: condition.to ? dayEndOf(condition.to) : undefined,
    sort: condition.sort === 'name.asc' ? 'name' : 'startsAt',
    descending: condition.sort === 'start_at.desc' ? true : undefined,
    page: condition.page,
    perPage: condition.perPage,
  })

  if (search.state === 'refused') {
    return {
      condition,
      channels,
      outcome: { state: 'refused', message: GUARD_MESSAGE },
    }
  }

  const { page } = search

  return {
    condition,
    channels,
    outcome: {
      state: 'searched',
      found: {
        hits: page.items.map((programme) => toHit(programme, carried)),
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

function compareChannels(left: GuideChannel, right: GuideChannel): number {
  for (let index = 0; index < left.sortKey.length; index++) {
    const gap = left.sortKey[index] - right.sortKey[index]

    if (gap !== 0) {
      return gap
    }
  }

  return 0
}
