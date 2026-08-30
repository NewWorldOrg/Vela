import type { GuideRelationKind } from '@/lib/guide'
import {
  carinaClient,
  revalidatingCarinaClient,
} from '@/repository/client/carina'
import type { components, paths } from '@/repository/client/schema'
import type { SearchField } from '@/lib/search-condition'
import type { ChannelKind } from '@/repository/channels'

type GuideResponder = components['schemas']['GuideResponder']
type ProgrammeResponder = components['schemas']['ProgrammeResponder']
type ProgrammeSearchResponder =
  components['schemas']['ProgrammeSearchResponder']
type TuneSystem = components['schemas']['TuneSystem']

/**
 * What the search takes, read off the endpoint rather than off a schema of its
 * own: the document spells these inline now that one reader parses the query
 * string for both a search and a rule, and the spellings are the API's own.
 */
type SearchParams = NonNullable<
  paths['/api/programs/search']['get']['parameters']['query']
>

export type ProgrammeField = NonNullable<SearchParams['fields']>[number]

export type ProgrammeSort = NonNullable<SearchParams['sort']>

export type SearchSystem = NonNullable<SearchParams['type']>

/** The parts of a programme a keyword is looked for in. */
export const SEARCH_FIELDS_OF: Record<SearchField, ProgrammeField[]> = {
  'title,description': ['Title', 'Description'],
  title: ['Title'],
  description: ['Description'],
}

/** The broadcast type a channel kind narrows the search to. */
export const SEARCH_SYSTEM_OF_KIND: Record<ChannelKind, SearchSystem> = {
  terrestrial: 'IsdbT',
  bs: 'IsdbSBs',
  cs110: 'IsdbSCs110',
}

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
  kind: GuideRelationKind
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
  keyword?: string
  exclude?: string
  fields?: ProgrammeField[]
  genres?: number[]
  system?: SearchSystem
  channels?: string[]
  from?: Date
  to?: Date
  sort?: ProgrammeSort
  descending?: boolean
  page?: number
  perPage?: number
}

export async function fetchGuide(query: GuideQuery): Promise<Guide> {
  const { data, error } = await revalidatingCarinaClient().GET(
    '/api/programs',
    {
      params: {
        query: {
          type: query.type,
          from: query.from.toISOString(),
          to: query.to.toISOString(),
        },
      },
    },
  )

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
          exclude: query.exclude,
          fields: query.fields?.length ? query.fields : undefined,
          genre: query.genres?.length ? query.genres : undefined,
          type: query.system,
          channel: query.channels?.length ? query.channels : undefined,
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
