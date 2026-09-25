import type { Channel } from '@/repository/channels'
import type { Genre, Program } from '@/repository/programs'

const STATIONS = [
  'みなと総合',
  'みなと教育',
  'かもめ放送',
  'ひばりテレビ',
  'あおぞら',
  'しおかぜ',
  'つばめ',
  'はやて',
  'こだま',
  'やまびこ',
]

const GENRES: [Genre, string][] = [
  ['news', 'ニュース/報道'],
  ['info', '情報/ワイドショー'],
  ['drama', 'ドラマ'],
  ['variety', 'バラエティ'],
  ['anime', 'アニメ/特撮'],
  ['doc', 'ドキュメンタリー/教養'],
  ['sports', 'スポーツ'],
  ['music', '音楽'],
  ['movie', '映画'],
]

const HEADS = [
  '朝の',
  '夕方の',
  '週末の',
  '港町',
  '山あいの',
  '北国の',
  '真夜中の',
  '列島',
  '旅する',
  '海辺の',
  '路地裏の',
  '昭和の',
]

const TAILS = [
  'ニュース',
  '天気と暮らし',
  '料理帖',
  '探訪記',
  '物語',
  '歌謡祭',
  '中継',
  '特集',
  '劇場',
  '散歩',
  '研究所',
  '事件簿',
]

const ABOUTS = [
  '記録的な暑さ 夜間も熱中症に警戒を',
  '夏の停電にそなえる',
  '職人が守り続ける手仕事の技',
  '港に集まる人びとの一日を追う',
  '若手の挑戦と老舗の意地',
  '懐かしの名曲をたっぷりと',
]

const LENGTHS = [15, 30, 30, 60, 30, 45, 60, 90, 30, 120, 25, 5, 60, 30]

const WINDOW_MIN = 24 * 60

const DAY_STARTS_AT = 4

function clockOf(minute: number): string {
  const whole = DAY_STARTS_AT * 60 + minute
  const hour = Math.floor(whole / 60) % 24
  const rest = whole % 60

  return `${String(hour).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export const A_FULL_DAY_CHANNELS: Channel[] = Array.from(
  { length: 27 },
  (_, nth) => {
    const station = STATIONS[Math.floor(nth / 3) % STATIONS.length]
    const branch = (nth % 3) + 1

    return {
      id: `full-${nth}`,
      no: String(11 + nth),
      name: `${station}${branch}`,
      kind: 'terrestrial' as const,
      ...(branch > 1 ? { sub: true, whole: `full-${nth - branch + 1}` } : {}),
    }
  },
)

export const A_FULL_DAY_PROGRAMS: Program[] = A_FULL_DAY_CHANNELS.flatMap(
  (channel, column) => {
    const programs: Program[] = []
    let at = 0
    let nth = 0

    while (at < WINDOW_MIN) {
      const seed = column * 7 + nth * 5
      const length = Math.min(LENGTHS[seed % LENGTHS.length], WINDOW_MIN - at)
      const [genre, genreLabel] = GENRES[(column + nth) % GENRES.length]

      programs.push({
        id: `${channel.id}-${nth}`,
        channelId: channel.id,
        title: `${HEADS[seed % HEADS.length]}${TAILS[(seed * 3 + column) % TAILS.length]}`,
        ...(nth % 3 === 0
          ? { description: ABOUTS[(seed + column) % ABOUTS.length] }
          : {}),
        genre,
        genreLabel,
        startMin: at,
        durationMin: length,
        startLabel: clockOf(at),
        endLabel: clockOf(at + length),
      })
      at += length
      nth += 1
    }

    return programs
  },
)

export const A_FULL_DAY_WINDOW = {
  windowStartHour: DAY_STARTS_AT,
  windowHours: 24,
  nowMin: 16 * 60 + 4,
  nowLabel: '20:04',
}
