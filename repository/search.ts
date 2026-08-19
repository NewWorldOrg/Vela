import { CHANNEL_FIXTURES } from '@/repository/channels.fixtures'
import { PROGRAM_FIXTURES } from '@/repository/programs.fixtures'
import type { Program } from '@/repository/programs'

export interface SearchCondition {
  q?: string
  exclude?: string
  fields?: string
  genre?: string
  kind?: string
  ch?: string
}

export interface SearchHit extends Program {
  channelName: string
  channelNo: string
  dayLabel: string
}

export interface SearchResult {
  condition: SearchCondition
  hasCondition: boolean
  hits: SearchHit[]
  genres: { value: string; label: string }[]
  channels: { value: string; label: string }[]
  channelName?: string
}

const FIELD_LABEL: Record<string, string> = {
  title: '番組名',
  'title,description': '番組名・概要',
  'title,description,detail': '番組名・概要・詳細',
}

export const SEARCH_FIELD_OPTIONS = Object.entries(FIELD_LABEL).map(
  ([value, label]) => ({ value, label }),
)

export function fieldLabel(value?: string) {
  return value ? (FIELD_LABEL[value] ?? value) : undefined
}

function normalize(text: string) {
  return text.normalize('NFKC').toLowerCase()
}

export async function searchPrograms(
  raw: SearchCondition,
): Promise<SearchResult> {
  const genres = [
    ...new Map(
      PROGRAM_FIXTURES.map((p) => [
        p.genre,
        { value: p.genre, label: p.genreLabel },
      ]),
    ).values(),
  ]
  const condition: SearchCondition = {
    q: raw.q?.trim() || undefined,
    exclude: raw.exclude?.trim() || undefined,
    fields: raw.fields && FIELD_LABEL[raw.fields] ? raw.fields : undefined,
    genre:
      raw.genre && genres.some((g) => g.value === raw.genre)
        ? raw.genre
        : undefined,
    kind: raw.kind === 'bs' || raw.kind === 'cs110' ? raw.kind : undefined,
    ch:
      raw.ch && CHANNEL_FIXTURES.some((c) => c.id === raw.ch)
        ? raw.ch
        : undefined,
  }
  const hasCondition = Object.values(condition).some(Boolean)

  const fields = (condition.fields ?? 'title,description').split(',')
  const tokens = condition.q
    ? normalize(condition.q).split(/\s+/).filter(Boolean)
    : []
  const excludes = condition.exclude
    ? normalize(condition.exclude).split(/\s+/).filter(Boolean)
    : []

  const haystack = (p: Program) =>
    fields
      .map((f) =>
        f === 'title'
          ? p.title
          : f === 'description'
            ? (p.description ?? '')
            : '',
      )
      .filter(Boolean)
      .map(normalize)

  const hits: SearchHit[] = hasCondition
    ? PROGRAM_FIXTURES.filter((p) => {
        const fieldsText = haystack(p)
        if (
          tokens.length &&
          !tokens.every((t) => fieldsText.some((f) => f.includes(t)))
        ) {
          return false
        }
        if (
          excludes.length &&
          excludes.some((t) => fieldsText.some((f) => f.includes(t)))
        ) {
          return false
        }
        if (condition.genre && p.genre !== condition.genre) {
          return false
        }
        if (condition.ch && p.channelId !== condition.ch) {
          return false
        }
        return true
      }).map((p) => {
        const channel = CHANNEL_FIXTURES.find((c) => c.id === p.channelId)
        return {
          ...p,
          channelName: channel?.name ?? '',
          channelNo: channel?.no ?? '',
          dayLabel: '08/08 (金)',
        }
      })
    : []

  return {
    condition,
    hasCondition,
    hits,
    genres,
    channels: CHANNEL_FIXTURES.map((c) => ({ value: c.id, label: c.name })),
    channelName: CHANNEL_FIXTURES.find((c) => c.id === condition.ch)?.name,
  }
}
