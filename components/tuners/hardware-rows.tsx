import type { TunerRow } from '@/repository/tuners'

const KIND_SAID: Record<NonNullable<TunerRow['kind']>, string> = {
  地上波: '地上波',
  衛星: 'BS・CS',
}

export function tunerTitleOf(row: TunerRow): { title: string; code: boolean } {
  return row.name === undefined
    ? { title: row.device, code: true }
    : { title: row.name, code: false }
}

export function tunerSubOf(row: TunerRow): string | undefined {
  const parts = [row.kind && KIND_SAID[row.kind], row.place].filter(
    (part): part is string => Boolean(part),
  )

  return parts.length === 0 ? undefined : parts.join(' · ')
}

export function tunerWhyOf(row: TunerRow): string | undefined {
  if (row.stateSub) {
    return row.stateSub
  }

  if (!row.session) {
    return undefined
  }

  return [
    row.session.saying ?? row.session.label,
    row.session.title,
    row.session.code,
    row.session.endsAt && `終了予定 ${row.session.endsAt}`,
  ]
    .filter((one): one is string => Boolean(one))
    .join('\n')
}
