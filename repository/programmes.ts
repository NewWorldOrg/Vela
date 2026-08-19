import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'

type GuideResponder = components['schemas']['GuideResponder']
type ProgrammeResponder = components['schemas']['ProgrammeResponder']
type ProgrammeSearchResponder =
  components['schemas']['ProgrammeSearchResponder']
type ProgrammeSort = components['schemas']['ProgrammeSort']
type TuneSystem = components['schemas']['TuneSystem']

export interface ProgrammeGenre {
  kind: number
  sort: number
}

export interface ProgrammeItem {
  heading: string
  text: string
}

export interface RelatedProgramme {
  networkId: number
  serviceId: number
  eventId: number
  kind: 'shared' | 'relayed' | 'moved'
}

export interface Programme {
  id: string
  networkId: number
  serviceId: number
  eventId: number
  startsAt: string
  /** Absent while the broadcaster has not said when it ends. */
  endsAt?: string
  name: string
  summary: string
  isShadow: boolean
  hasSubtitles: boolean
  isArchived: boolean
  genres: ProgrammeGenre[]
  items: ProgrammeItem[]
  related: RelatedProgramme[]
}

export interface Guide {
  programmes: Programme[]
}

export interface ProgrammePage {
  items: Programme[]
  total: number
  currentPage: number
  lastPage: number
  perPage: number
}

export interface GuideQuery {
  type: TuneSystem
  from: Date
  to: Date
}

export interface SearchQuery {
  keyword: string
  from?: Date
  to?: Date
  sort?: ProgrammeSort
  descending?: boolean
  page?: number
  perPage?: number
}

export async function fetchGuide(query: GuideQuery): Promise<Guide> {
  const { data, error } = await carinaClient().GET('/api/programs', {
    params: {
      query: {
        type: query.type,
        from: query.from.toISOString(),
        to: query.to.toISOString(),
      },
    },
  })

  if (error || !data?.data) {
    throw new Error(data?.message || '番組表を読めませんでした')
  }

  return toGuide(data.data)
}

export async function fetchProgramme(id: string): Promise<Programme | null> {
  const { data, response } = await carinaClient().GET('/api/programs/{id}', {
    params: { path: { id } },
  })

  if (response.status === 404 || response.status === 400) {
    return null
  }

  if (!data?.data) {
    throw new Error(data?.message || '番組を読めませんでした')
  }

  return toProgramme(data.data)
}

export type ProgrammeSearch =
  { state: 'ok'; page: ProgrammePage } | { state: 'refused' }

export async function searchProgrammes(
  query: SearchQuery,
): Promise<ProgrammeSearch> {
  const { data, error, response } = await carinaClient().GET(
    '/api/programs/search',
    {
      params: {
        query: {
          keyword: query.keyword,
          from: query.from?.toISOString(),
          to: query.to?.toISOString(),
          sort: query.sort,
          descending: query.descending,
          page: query.page,
          perPage: query.perPage,
        },
      },
    },
  )

  if (response.status === 400) {
    return { state: 'refused' }
  }

  if (error || !data?.data) {
    throw new Error(data?.message || '番組を探せませんでした')
  }

  return { state: 'ok', page: toPage(data.data) }
}

export function toInt(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}

function toGuide(guide: GuideResponder): Guide {
  return {
    programmes: (guide.programmes ?? []).map(toProgramme),
  }
}

function toPage(page: ProgrammeSearchResponder): ProgrammePage {
  return {
    items: (page.items ?? []).map(toProgramme),
    total: toInt(page.total),
    currentPage: toInt(page.currentPage),
    lastPage: toInt(page.lastPage),
    perPage: toInt(page.perPage),
  }
}

function toProgramme(programme: ProgrammeResponder): Programme {
  return {
    id: programme.id ?? '',
    networkId: toInt(programme.networkId),
    serviceId: toInt(programme.serviceId),
    eventId: toInt(programme.eventId),
    startsAt: programme.startsAt,
    endsAt: programme.endsAt ?? undefined,
    name: programme.name ?? '',
    summary: programme.summary ?? '',
    isShadow: programme.isShadow,
    hasSubtitles: programme.hasSubtitles,
    isArchived: programme.isArchived,
    genres: (programme.genres ?? []).map((genre) => ({
      kind: toInt(genre.kind),
      sort: toInt(genre.sort),
    })),
    items: (programme.items ?? []).map((item) => ({
      heading: item.heading ?? '',
      text: item.text ?? '',
    })),
    related: (programme.related ?? []).map((related) => ({
      networkId: toInt(related.networkId),
      serviceId: toInt(related.serviceId),
      eventId: toInt(related.eventId),
      kind: related.kind,
    })),
  }
}
