import type {
  LiveChannel,
  LiveProfile,
  LiveProgramme,
  LiveScreen,
} from '@/repository/live'

/** The evening every fixture below sits in; the clock reads 21:04. */
const NOW = '2026-08-08T12:04:00Z'

function programme(
  id: string,
  title: string,
  start: string,
  end: string | undefined,
  over: Partial<LiveProgramme> = {},
): LiveProgramme {
  return {
    id,
    title,
    startsAt: `2026-08-08T${start}:00+09:00`,
    endsAt: end === undefined ? undefined : `2026-08-08T${end}:00+09:00`,
    startLabel: start,
    endLabel: end,
    hasSubtitles: false,
    genreLabel: 'その他',
    ...over,
  }
}

export const LIVE_CHANNEL_FIXTURES: LiveChannel[] = [
  {
    id: '32736-1024',
    networkId: 32736,
    serviceId: 1024,
    name: 'みなと総合1',
    no: '1',
    kind: 'terrestrial',
    viewers: 1,
    now: programme('p001', 'ニュースの視点9', '21:00', '22:00', {
      hasSubtitles: true,
      genreLabel: 'ニュース/報道',
    }),
    next: programme('p002', 'クローズアップ列島', '22:00', '22:30'),
    progressPct: 7,
  },
  {
    id: '32736-1025',
    networkId: 32736,
    serviceId: 1025,
    name: 'みなと総合2',
    no: '1',
    kind: 'terrestrial',
    sub: true,
    whole: '32736-1024',
    viewers: 0,
    now: programme('p001', 'ニュースの視点9', '21:00', '22:00', {
      hasSubtitles: true,
      genreLabel: 'ニュース/報道',
    }),
    next: programme('p002', 'クローズアップ列島', '22:00', '22:30'),
    progressPct: 7,
  },
  {
    id: '32737-1032',
    networkId: 32737,
    serviceId: 1032,
    name: 'みなと教育1',
    no: '2',
    kind: 'terrestrial',
    viewers: 0,
    now: programme('p003', 'きょうの献立 夏のさっぱり', '20:55', '21:25', {
      genreLabel: '趣味/教育',
    }),
    next: programme('p004', 'きょうの健康', '21:25', '21:40'),
    progressPct: 30,
  },
  {
    id: '32738-1040',
    networkId: 32738,
    serviceId: 1040,
    name: '中央テレビ1',
    no: '4',
    kind: 'terrestrial',
    viewers: 2,
    now: programme('p005', 'news zero', '20:54', '22:00', {
      genreLabel: 'ニュース/報道',
    }),
    next: programme('p006', 'スポーツニュース', '22:00', '22:54'),
    progressPct: 15,
  },
  {
    id: '32741-1064',
    networkId: 32741,
    serviceId: 1064,
    name: '第一テレビ1',
    no: '5',
    kind: 'terrestrial',
    viewers: 0,
    now: programme('p007', '報道ステーション', '21:00', '22:10', {
      hasSubtitles: true,
      genreLabel: 'ニュース/報道',
    }),
    next: programme('p008', '木曜ドラマ「灯台のある町」', '22:10', undefined),
    progressPct: 6,
  },
  {
    id: '32739-1048',
    networkId: 32739,
    serviceId: 1048,
    name: '湾岸放送1',
    no: '6',
    kind: 'terrestrial',
    viewers: 0,
    now: programme('p009', 'news23', '21:00', '22:00'),
    next: programme('p010', '木曜劇場', '22:00', '22:54'),
    progressPct: 7,
  },
  {
    id: '32742-1072',
    networkId: 32742,
    serviceId: 1072,
    name: '東都テレビ1',
    no: '7',
    kind: 'terrestrial',
    viewers: 0,
    now: programme('p011', 'ワールドビジネス', '21:00', '22:00'),
    next: programme('p012', 'ガイアの夜明け', '22:00', '22:54'),
    progressPct: 7,
  },
  {
    id: '32739-1049',
    networkId: 32739,
    serviceId: 1049,
    name: '湾岸放送2',
    no: '6',
    kind: 'terrestrial',
    sub: true,
    whole: '32739-1048',
    viewers: 0,
    now: programme('p013', '深夜の海図', '20:30', '22:00'),
    next: programme('p014', '湾岸ジャズ', '22:00', '23:00'),
    progressPct: 36,
  },
  {
    id: '32391-23608',
    networkId: 32391,
    serviceId: 23608,
    name: 'シティ MX1',
    no: '9',
    kind: 'terrestrial',
    viewers: 0,
  },
]

export const LIVE_PROFILE_FIXTURES: LiveProfile[] = [
  { name: '1080p60', width: 1920, height: 1080 },
  { name: '1080p30', width: 1920, height: 1080 },
  { name: '720p60', width: 1280, height: 720 },
  { name: '720p30', width: 1280, height: 720 },
]

export const LIVE_NOW_FIXTURE = NOW

export const LIVE_SCREEN_FIXTURE: LiveScreen = {
  kind: 'terrestrial',
  kinds: ['terrestrial', 'bs', 'cs110'],
  channels: LIVE_CHANNEL_FIXTURES,
  watching: {
    channel: LIVE_CHANNEL_FIXTURES[0],
    progressPct: 7,
    nowLabel: '21:04',
    restMin: 56,
  },
  profiles: LIVE_PROFILE_FIXTURES,
  tuners: 2,
}
