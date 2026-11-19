const MARKS_BEFORE = /^(?:\s*[[【(〔][^\]】)〕]{1,4}[\]】)〕])+\s*/u

const EPISODE_STARTS =
  /\s*(?:[「『【〈《<]|#\s*\d|第\s*\d+\s*[話回]|\(\s*\d+\s*\)|\s[-–—]\s)/u

function shapeOf(title: string): string {
  return title.normalize('NFKC').replace(/\s+/gu, ' ').trim()
}

function splitOf(title: string): [string, string | undefined] {
  const shaped = shapeOf(title).replace(MARKS_BEFORE, '')
  const cut = shaped.search(EPISODE_STARTS)

  if (cut <= 0) {
    return [shaped, undefined]
  }

  return [shaped.slice(0, cut).trim(), shaped.slice(cut).trim() || undefined]
}

export function seriesNameOf(title: string): string {
  return splitOf(title)[0]
}

export function episodeOf(title: string): string | undefined {
  return splitOf(title)[1]
}

export interface Series<T> {
  key: string
  name: string
  items: T[]
}

export function seriesOf<T extends { title: string; startedAt: string }>(
  items: readonly T[],
): Series<T>[] {
  const found = new Map<string, Series<T>>()

  for (const item of items) {
    const name = seriesNameOf(item.title)
    const series = found.get(name)

    if (series) {
      series.items.push(item)
    } else {
      found.set(name, { key: name, name, items: [item] })
    }
  }

  const newestFirst = (a: T, b: T) => b.startedAt.localeCompare(a.startedAt)

  return [...found.values()]
    .map((one) => ({ ...one, items: [...one.items].sort(newestFirst) }))
    .sort((a, b) => newestFirst(a.items[0], b.items[0]))
}
