import type { Recording } from '@/repository/recordings'
import { RECORDING_FIXTURES } from '@/stories/fixtures/recordings'

/** A drawn still: a sky, two hills and a sun in a hue of its own, so a grid of them reads as pictures without being anyone's broadcast. */
function stillOf(hue: number, sun = 0.72): string {
  const sky = `hsl(${hue} 62% 74%)`
  const far = `hsl(${(hue + 40) % 360} 34% 52%)`
  const near = `hsl(${(hue + 70) % 360} 38% 34%)`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="hsl(${hue} 70% 90%)"/></linearGradient></defs>
<rect width="320" height="180" fill="url(#s)"/>
<circle cx="${Math.round(320 * sun)}" cy="52" r="22" fill="hsl(${(hue + 190) % 360} 90% 92%)"/>
<path d="M0 120 70 82l60 30 70-48 120 54v62H0Z" fill="${far}"/>
<path d="M0 150 90 118l80 22 60-18 90 30v28H0Z" fill="${near}"/>
</svg>`

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const [, BASE] = RECORDING_FIXTURES

const DAY_LABELS: Record<string, string> = {
  '2026-10-30': '10/30(金)',
  '2026-10-29': '10/29(木)',
  '2026-10-28': '10/28(水)',
  '2026-10-27': '10/27(火)',
  '2026-10-26': '10/26(月)',
  '2026-10-23': '10/23(金)',
  '2026-10-22': '10/22(木)',
  '2026-10-20': '10/20(火)',
  '2026-10-16': '10/16(木)',
  '2026-10-15': '10/15(水)',
  '2026-10-14': '10/14(火)',
}

function shelfOf(
  id: string,
  title: string,
  day: string,
  clock: string,
  hue: number,
  more: Partial<Recording> = {},
): Recording {
  const lengthSec = more.lengthSec ?? 10 * 60

  return {
    ...BASE,
    id,
    title,
    note: undefined,
    description: undefined,
    cast: undefined,
    startedAt: `${day}T${clock}:00+09:00`,
    recordedAtLabel: `${DAY_LABELS[day]} ${clock}`,
    recordedRange: `${day.replaceAll('-', '/')} ${clock}`,
    filePath: `/srv/recordings/${id}.m2ts`,
    lengthSec,
    thumbnail: 'shot',
    thumbnailHref: stillOf(hue, (hue % 7) / 10 + 0.2),
    encode: 'completed',
    ...more,
  }
}

const ANIME = { channel: 'みなと教育1', channelNo: '191', genre: 'アニメ' }
const LATE = {
  channel: '第一テレビ1',
  channelNo: '181',
  genre: 'アニメ',
  lengthSec: 30 * 60,
}
const NEWS = {
  channel: 'みなと総合1',
  channelNo: '151',
  genre: 'ニュース/報道',
  lengthSec: 32 * 60,
}

/** Two weeks of a library: an evening cartoon every day, a late show each week and a news programme, some watched, some part-way, some not at all. */
export const LIBRARY_SHELF: Recording[] = [
  shelfOf(
    '2101',
    'となりの発明王「空飛ぶ傘の巻」',
    '2026-10-30',
    '18:50',
    200,
    {
      ...ANIME,
      encode: 'running',
    },
  ),
  shelfOf('2100', 'となりの発明王', '2026-10-29', '18:50', 160, ANIME),
  shelfOf('2099', 'となりの発明王', '2026-10-28', '18:50', 120, ANIME),
  shelfOf(
    '2098',
    'コメット急行 #104 夜明けの駅とふたりの車掌',
    '2026-10-27',
    '23:00',
    280,
    { ...LATE, watchedSec: 19 * 60 },
  ),
  shelfOf('2097', 'となりの発明王', '2026-10-27', '18:50', 90, {
    ...ANIME,
    watchedSec: 600,
  }),
  shelfOf('2096', 'となりの発明王', '2026-10-26', '18:50', 60, {
    ...ANIME,
    watchedSec: 600,
  }),
  shelfOf('2095', 'となりの発明王', '2026-10-23', '18:50', 230, {
    ...ANIME,
    watchedSec: 240,
  }),
  shelfOf('2094', 'となりの発明王', '2026-10-22', '18:50', 140, {
    ...ANIME,
    watchedSec: 600,
  }),
  shelfOf('2093', 'コメット急行 #103', '2026-10-20', '23:00', 300, {
    ...LATE,
    watchedSec: 7 * 60,
    gap: { label: '欠け 3 秒', detail: '23:14 に 3 秒' },
  }),
  shelfOf('2092', '国会の窓「予算委員会」', '2026-10-16', '13:00', 30, {
    ...NEWS,
    watchedSec: 11 * 60,
  }),
  shelfOf('2091', '国会の窓', '2026-10-15', '13:00', 20, {
    ...NEWS,
    watchedSec: NEWS.lengthSec,
  }),
  shelfOf('2090', '国会の窓', '2026-10-14', '13:00', 10, NEWS),
]
