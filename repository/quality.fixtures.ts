import type { Route } from 'next'

import { formatMomentSpan } from '@/lib/format'
import type { QualityLevel } from '@/lib/quality'
import { QUALITY_LEVEL_LABEL } from '@/lib/quality'
import { trendAxis } from '@/lib/quality-trend'
import type {
  QualityAnomaly,
  QualityChannel,
  QualityResult,
  QualityThreshold,
  QualityTrend,
  QualityTrendBucket,
  QualityTrendRow,
  QualityTuner,
} from '@/repository/quality'

const WINDOWS = [
  { label: '24 時間', days: 1 },
  { label: '7 日', days: 7 },
  { label: '30 日', days: 30 },
]

const windows = (current: string) =>
  WINDOWS.map((one) => ({
    label: one.label,
    href: `/settings/quality?days=${one.days}` as Route,
    current: one.label === current,
  }))

const THRESHOLDS: QualityThreshold[] = [
  {
    key: 'packetsLostWarning',
    label: 'ドロップ率の警告水準',
    value: '0.02%',
    source: 'shipped',
    shipped: '0.02%',
    amount: '0.02',
    unit: '%',
    lowest: 0,
    highest: 100,
  },
  {
    key: 'packetsLostUnwatchable',
    label: 'ドロップ率の視聴不可の恐れ',
    value: '0.1%',
    source: 'shipped',
    shipped: '0.1%',
    amount: '0.1',
    unit: '%',
    lowest: 0,
    highest: 100,
  },
  {
    key: 'packetsLeftScrambled',
    label: 'スクランブル残存率の上限',
    value: '0.05%',
    source: 'shipped',
    shipped: '0.05%',
    amount: '0.05',
    unit: '%',
    lowest: 0,
    highest: 100,
  },
  {
    key: 'packetsLeftScrambledUnwatchable',
    label: 'スクランブル残存率の視聴不可の恐れ',
    value: '1%',
    source: 'shipped',
    shipped: '1%',
    amount: '1',
    unit: '%',
    lowest: 0,
    highest: 100,
  },
  {
    key: 'overflows',
    label: '取りこぼしの上限',
    value: '3 回',
    source: 'byHand',
    sourceLabel: '手動設定',
    basis: '既定 1 回',
    shipped: '1 回',
    amount: '3',
    unit: '回',
    lowest: 0,
    highest: 1000000,
  },
  {
    key: 'lockRate',
    label: 'lock 率の下限',
    value: '99%',
    source: 'shipped',
    shipped: '99%',
    amount: '99',
    unit: '%',
    lowest: 0,
    highest: 100,
  },
  {
    key: 'carrierToNoiseFloor',
    label: 'CNR の下限',
    value: '19.5 dB',
    source: 'measured',
    sourceLabel: '実測',
    basis: 'セッション 240 件(ドロップ 18 件)· 09/01〜09/07',
    measured: '19.5 dB',
    shipped: '15 dB',
    amount: '19.5',
    unit: 'dB',
    lowest: -100,
    highest: 100,
  },
  {
    key: 'bitErrorRateCeiling',
    label: 'post-Viterbi ビット誤り率の上限',
    value: '5.0e-3',
    source: 'byHand',
    sourceLabel: '手動設定',
    basis: '実測 3.0e-3 · 既定 1.0e-4',
    measured: '3.0e-3',
    shipped: '1.0e-4',
    amount: '0.005',
    unit: '',
    lowest: 0,
    highest: 1,
  },
  {
    key: 'supplySilence',
    label: '供給途絶の判定',
    value: '5 分',
    source: 'shipped',
    shipped: '5 分',
    amount: '5',
    unit: '分',
    lowest: 0.016666,
    highest: 1440,
  },
]

const NOT_SAMPLED = { level: 'unmeasured' } as const

const ANOMALIES: QualityAnomaly[] = [
  {
    id: 'anomaly-1',
    title: 'ドロップ率が視聴不可の恐れを超過',
    subject: 'みなと総合1',
    observed: '観測 0.152%',
    applied: '適用閾値 0.1%',
    level: 'bad',
    levelLabel: '視聴不可の恐れ',
    when: '08/09 21:00 発生 · 継続中',
  },
  {
    id: 'anomaly-2',
    title: '信号品質の供給途絶',
    subject: 'adapter0.frontend0',
    observed: '途絶 10 分',
    applied: '適用閾値 5 分',
    level: 'unreachable',
    levelLabel: '取得できず',
    when: '08/10 09:34 発生 · 継続中',
  },
  {
    id: 'anomaly-3',
    title: 'lock 率が下限を下回った',
    subject: 'adapter2.frontend0',
    observed: '観測 62.000%',
    applied: '適用閾値 99%',
    level: 'warn',
    levelLabel: '警告水準',
    restatedBy: 'チューナー',
    classification: '① 信号を掴めない',
    when: '08/09 18:41 発生 · 継続中',
  },
  {
    id: 'anomaly-4',
    title: 'チューナーが電波を掴めない',
    subject: 'adapter1.frontend0',
    observed: '観測 3 回続けて失敗',
    level: 'warn',
    levelLabel: '警告水準',
    restatedBy: 'チューナー',
    classification: '受信不可',
    when: '08/10 07:12 発生 · 継続中',
  },
  {
    id: 'anomaly-5',
    title: 'CNR が下限を下回った',
    subject: 'みなと総合1 · adapter0.frontend0',
    observed: '観測 17.2 dB',
    applied: '適用閾値 19.5 dB',
    level: 'warn',
    levelLabel: '警告水準',
    when: '08/10 05:20 発生 · 継続中',
  },
]

const TREND_SUBJECTS = [
  { label: 'ドロップ率', subject: 'packetsLost' },
  { label: 'スクランブル残存率', subject: 'packetsLeftScrambled' },
  { label: 'lock 率', subject: 'lockRate' },
  { label: 'CNR', subject: 'carrierToNoise' },
  { label: 'post-Viterbi ビット誤り率', subject: 'bitErrorRate' },
]

const trendSubjects = (current: string, days: number) =>
  TREND_SUBJECTS.map((one) => ({
    label: one.label,
    href: `/settings/quality?days=${days}&subject=${one.subject}` as Route,
    current: one.label === current,
  }))

const HOUR = 60 * 60 * 1000

const A_DAY = 24 * HOUR

const DAY_OPENS = Date.UTC(2026, 8, 7, 15)

const WEEK_OPENS = Date.UTC(2026, 8, 1, 5)

const MONTH_OPENS = Date.UTC(2026, 7, 9, 19)

interface TrendShape {
  line: number
  spell: (value: number) => string
}

const DROP: TrendShape = { line: 0.02, spell: (value) => `${value}%` }

const CNR: TrendShape = { line: 15, spell: (value) => `${value}dB` }

const MARKED: Record<string, QualityLevel> = {
  g: 'good',
  w: 'warn',
  b: 'bad',
  x: 'unreachable',
  u: 'unmeasured',
}

const COUNTED: QualityLevel[] = ['good', 'warn', 'bad']

type Worst = (at: number, level: QualityLevel) => number

const bucketOf = (
  from: number,
  until: number,
  level: QualityLevel,
  value: number | undefined,
  shape: TrendShape,
): QualityTrendBucket => ({
  key: new Date(from).toISOString(),
  level,
  from,
  until,
  worst: value,
  says: [
    formatMomentSpan(from, until),
    QUALITY_LEVEL_LABEL[level],
    ...(value === undefined ? [] : [`最悪 ${shape.spell(value)}`]),
    `適用閾値 ${shape.spell(shape.line)}`,
  ].join(' · '),
})

const bucketsOf = (
  pattern: string,
  worst: Worst,
  shape: TrendShape,
  opens: number,
  step: number,
): QualityTrendBucket[] =>
  [...pattern].map((mark, at) => {
    const level = MARKED[mark] ?? 'nodata'
    const from = opens + at * step

    return bucketOf(
      from,
      from + step,
      level,
      COUNTED.includes(level) ? worst(at, level) : undefined,
      shape,
    )
  })

const rowOf = (
  key: string,
  name: string,
  buckets: QualityTrendBucket[],
  shape: TrendShape,
): QualityTrendRow => ({
  key,
  name,
  buckets,
  line: { value: shape.line, says: shape.spell(shape.line) },
})

const trendOver = (
  subject: string,
  days: number,
  opens: number,
  rows: QualityTrendRow[],
): QualityTrend => {
  const until = opens + days * A_DAY

  return {
    subjects: trendSubjects(subject, days),
    rows,
    from: opens,
    until,
    ...trendAxis(opens, until, days),
  }
}

const cnr: Worst = (at, level) =>
  level === 'good' ? 28 + (at % 4) * 1.5 : 12.5 - (at % 2)

const hourlyCnr = (pattern: string) =>
  bucketsOf(pattern, cnr, CNR, DAY_OPENS, HOUR)

export const SIGNAL_TREND: QualityTrend = trendOver('CNR', 1, DAY_OPENS, [
  rowOf('whole', '全体', hourlyCnr('ggggww..ggggggxgggggg...'), CNR),
  rowOf(
    '32736-1024',
    'みなと総合1',
    hourlyCnr('gg..ww....gggg.x....gg..'),
    CNR,
  ),
  rowOf(
    '32737-1032',
    '中央テレビ1',
    hourlyCnr('..gg......gg....gggg....'),
    CNR,
  ),
  rowOf(
    '32738-1040',
    'みなと教育1',
    hourlyCnr('........................'),
    CNR,
  ),
])

const OVER = [0.034, 0.027, 0.041]

const drop =
  (values: number[]): Worst =>
  (at, level) =>
    level === 'good' ? values[at % values.length] : OVER[at % OVER.length]

const hourlyDrop = (pattern: string, values: number[]) =>
  bucketsOf(pattern, drop(values), DROP, DAY_OPENS, HOUR)

const ONE_RECORDING = '.....................gg.'

export const ONE_RECORDING_TREND: QualityTrend = trendOver(
  'ドロップ率',
  1,
  DAY_OPENS,
  [
    rowOf('whole', '全体', hourlyDrop(ONE_RECORDING, [0.004, 0.011]), DROP),
    rowOf(
      '32736-1024',
      'みなと総合1',
      hourlyDrop(ONE_RECORDING, [0.004, 0.011]),
      DROP,
    ),
    rowOf(
      '32737-1032',
      '中央テレビ1',
      hourlyDrop('........................', [0]),
      DROP,
    ),
  ],
)

const RISING = [0.006, 0.012, 0.003, 0.009]

export const OVER_THE_LINE_TREND: QualityTrend = trendOver(
  'ドロップ率',
  1,
  DAY_OPENS,
  [
    rowOf(
      'whole',
      '全体',
      hourlyDrop('..gggwg....ggwg....gg.g.', RISING),
      DROP,
    ),
    rowOf(
      '32736-1024',
      'みなと総合1',
      hourlyDrop('..gggwg.........gg......', RISING),
      DROP,
    ),
    rowOf(
      '32737-1032',
      '中央テレビ1',
      hourlyDrop('...........ggwg....gg.g.', [0.002, 0.008, 0.004]),
      DROP,
    ),
  ],
)

const WEEKLY = [0.005, 0.009, 0.002, 0.013, 0.007]

const quarterDays = (pattern: string) =>
  bucketsOf(pattern, drop(WEEKLY), DROP, WEEK_OPENS, 6 * HOUR)

export const WEEK_TREND: QualityTrend = trendOver('ドロップ率', 7, WEEK_OPENS, [
  rowOf('whole', '全体', quarterDays('.gg..g..ggg..w..gg...g..ggg.'), DROP),
  rowOf(
    '32736-1024',
    'みなと総合1',
    quarterDays('.gg.....ggg..w.......g......'),
    DROP,
  ),
])

const BROADCAST_DAY_OPENS = Date.UTC(2026, 8, 7, 3, 39)

const BROADCAST_DAY_TURNS = Date.UTC(2026, 8, 7, 19)

const broadcastDays = (value: number | undefined) => [
  bucketOf(
    Date.UTC(2026, 8, 7, 3),
    BROADCAST_DAY_TURNS,
    value === undefined ? 'nodata' : 'good',
    value,
    DROP,
  ),
  bucketOf(
    BROADCAST_DAY_TURNS,
    BROADCAST_DAY_OPENS + A_DAY,
    'nodata',
    undefined,
    DROP,
  ),
]

export const BROADCAST_DAYS_TREND: QualityTrend = trendOver(
  'ドロップ率',
  1,
  BROADCAST_DAY_OPENS,
  [
    rowOf('whole', '全体', broadcastDays(0.0009), DROP),
    rowOf('32736-1024', 'みなと総合1', broadcastDays(0.0014), DROP),
    rowOf('32737-1032', '中央テレビ1', broadcastDays(undefined), DROP),
  ],
)

export const QUALITY: QualityResult = {
  windows: windows('24 時間'),
  trend: SIGNAL_TREND,
  stats: [
    {
      key: 'drop',
      label: '直近 24 時間のドロップ率',
      value: '0.021',
      unit: '%',
      level: 'warn',
      levelLabel: '警告水準',
      foot: '録画 14 件 / うち未計測 3 件',
    },
    {
      key: 'problem',
      label: '問題のある録画',
      value: '3',
      unit: '件',
      level: 'bad',
      levelLabel: '視聴不可の恐れ',
    },
    {
      key: 'scramble',
      label: 'スクランブル残存率',
      value: '0.000',
      unit: '%',
      level: 'good',
      levelLabel: '良好',
      aside: '録画 11 件を計測',
    },
    {
      key: 'health',
      label: 'チューナーヘルス',
      value: '2 / 4',
      unit: '健全',
      level: 'bad',
      levelLabel: '視聴不可 1 本',
      foot: '信号品質 未計測',
    },
  ],
  thresholds: THRESHOLDS,
  warnMarkPct: 20,
  channels: [
    {
      id: '32736-1024',
      name: 'みなと総合1',
      no: '151',
      dropRate: '0.152%',
      barPct: 100,
      level: 'bad',
      note: '録画 2 件を計測',
    },
    {
      id: '32737-1032',
      name: '中央テレビ1',
      no: '131',
      dropRate: '0.031%',
      barPct: 31,
      level: 'warn',
      note: '録画 1 件を計測',
    },
    {
      id: '32738-1040',
      name: 'みなと教育1',
      no: '191',
      dropRate: '0.002%',
      barPct: 2,
      level: 'good',
      note: '録画 3 件を計測',
    },
    {
      id: '32739-1048',
      name: '東都テレビ1',
      no: '161',
      dropRate: '0.003%',
      barPct: 3,
      level: 'good',
      note: '録画 2 件を計測',
    },
    {
      id: '32740-1056',
      name: '湾岸放送1',
      no: '171',
      dropRate: '0.002%',
      barPct: 2,
      level: 'good',
      note: '録画 2 件を計測',
    },
    {
      id: '32741-1064',
      name: '第一テレビ1',
      no: '181',
      dropRate: '0.006%',
      barPct: 6,
      level: 'good',
      note: '録画 1 件を計測',
    },
    {
      id: '32742-1072',
      name: 'シティ MX1',
      no: '141',
      level: 'unmeasured',
      note: '録画 3 件 / うち未計測 3 件',
    },
  ],
  satellites: [],
  tuners: [
    {
      id: 'adapter1.frontend0',
      device: 'adapter1.frontend0',
      hardware: '録画 9 件を計測',
      state: { level: 'good', label: '健全' },
      drop: { value: '0.002', unit: '%', level: 'good' },
      lock: NOT_SAMPLED,
      cnr: NOT_SAMPLED,
      ber: NOT_SAMPLED,
    },
    {
      id: 'adapter1.frontend1',
      device: 'adapter1.frontend1',
      hardware: '録画 4 件を計測',
      state: { level: 'good', label: '健全' },
      drop: { value: '0.001', unit: '%', level: 'good' },
      lock: NOT_SAMPLED,
      cnr: NOT_SAMPLED,
      ber: NOT_SAMPLED,
    },
    {
      id: 'adapter3.frontend0',
      device: 'adapter3.frontend0',
      hardware: '録画 2 件を計測',
      state: { level: 'bad', label: '視聴不可' },
      drop: { value: '0.152', unit: '%', level: 'bad' },
      lock: NOT_SAMPLED,
      cnr: NOT_SAMPLED,
      ber: NOT_SAMPLED,
    },
    {
      id: 'adapter3.frontend1',
      device: 'adapter3.frontend1',
      hardware: '録画 3 件 / うち未計測 3 件',
      state: { level: 'unmeasured', label: '未計測' },
      drop: NOT_SAMPLED,
      lock: NOT_SAMPLED,
      cnr: NOT_SAMPLED,
      ber: NOT_SAMPLED,
    },
  ],
  problemRecordings: [
    {
      id: 'rec-1',
      title: 'みなと ニュース7',
      where: 'みなと総合1 · 08/09 21:00',
      drops: 'ドロップ 3,842',
      pct: '0.152%',
      level: 'bad',
      gap: { reading: '欠け 0 回 · 0.0 秒', level: 'good' },
    },
    {
      id: 'rec-2',
      title: '夕方いちばん',
      where: '中央テレビ1 · 08/10 08:15',
      drops: 'ドロップ 812',
      pct: '0.031%',
      level: 'warn',
      gap: { reading: '欠け 1 回 · 3.8 秒', level: 'warn' },
    },
    {
      id: 'rec-3',
      title: '週末の旅ノート',
      where: 'みなと教育1 · 08/10 19:30',
      drops: 'ドロップ 0',
      level: 'good',
      gap: { reading: '欠け 2 回 · 12.4 秒', level: 'warn' },
    },
  ],
  supplies: {
    read: true,
    quiet: [
      {
        key: 'signalSamples',
        supply: '信号品質',
        note: '見ている 2 件のうち 1 件が途絶',
      },
    ],
  },
  anomalies: {
    items: ANOMALIES,
    owned: 3,
    restated: 2,
  },
}

export const NOTHING_MEASURED: QualityResult = {
  windows: windows('30 日'),
  trend: trendOver('ドロップ率', 30, MONTH_OPENS, [
    rowOf(
      'whole',
      '全体',
      bucketsOf(
        '..............................',
        drop([0]),
        DROP,
        MONTH_OPENS,
        A_DAY,
      ),
      DROP,
    ),
  ]),
  stats: [
    {
      key: 'drop',
      label: '直近 30 日のドロップ率',
      level: 'unmeasured',
      levelLabel: '未計測',
      foot: '録画 0 件',
    },
    {
      key: 'problem',
      label: '問題のある録画',
      value: '0',
      unit: '件',
    },
    {
      key: 'scramble',
      label: 'スクランブル残存率',
      level: 'unmeasured',
      levelLabel: '未計測',
      aside: '録画 0 件',
    },
    {
      key: 'health',
      label: 'チューナーヘルス',
      level: 'nodata',
      levelLabel: '対象なし',
      foot: '信号品質 未計測',
    },
  ],
  thresholds: THRESHOLDS,
  warnMarkPct: 20,
  channels: [],
  satellites: [],
  tuners: [],
  problemRecordings: [],
  supplies: { read: false, quiet: [] },
  anomalies: {
    items: [],
    owned: 0,
    restated: 0,
  },
}

const UNMEASURED_CHANNELS: QualityChannel[] = [
  { id: '32736-1024', name: 'みなと総合1', no: '151', recordings: 9 },
  { id: '32737-1032', name: '中央テレビ1', no: '131', recordings: 8 },
  { id: '32738-1040', name: 'みなと教育1', no: '191', recordings: 7 },
  { id: '32739-1048', name: '東都テレビ1', no: '161', recordings: 6 },
].map(({ recordings, ...channel }): QualityChannel => ({
  ...channel,
  level: 'unmeasured',
  note: `録画 ${recordings} 件 / うち未計測 ${recordings} 件`,
}))

const UNMEASURED_SATELLITES: QualityChannel[] = [
  { id: '4-16400', name: 'みなと BS1', no: '211', recordings: 4 },
  { id: '4-16401', name: '東都 BS1', no: '231', recordings: 2 },
].map(({ recordings, ...channel }): QualityChannel => ({
  ...channel,
  level: 'unmeasured',
  note: `録画 ${recordings} 件 / うち未計測 ${recordings} 件`,
}))

const UNMEASURED_TUNERS: QualityTuner[] = [
  { device: 'adapter1.frontend0', recordings: 9 },
  { device: 'adapter1.frontend1', recordings: 8 },
  { device: 'adapter3.frontend0', recordings: 7 },
  { device: 'adapter3.frontend1', recordings: 12 },
].map(({ device, recordings }): QualityTuner => ({
  id: device,
  device,
  hardware: `録画 ${recordings} 件 / うち未計測 ${recordings} 件`,
  state: { level: 'unmeasured', label: '未計測' },
  drop: NOT_SAMPLED,
  lock: NOT_SAMPLED,
  cnr: NOT_SAMPLED,
  ber: NOT_SAMPLED,
}))

export const EVERY_ROW_UNMEASURED: QualityResult = {
  windows: windows('24 時間'),
  trend: trendOver('ドロップ率', 1, DAY_OPENS, [
    rowOf('whole', '全体', hourlyDrop('uuuuuuuuuuuuuuuuuuuuuuuu', [0]), DROP),
    rowOf(
      '32736-1024',
      'みなと総合1',
      hourlyDrop('uuuuuuuuuuuuuuuuuuuuuuuu', [0]),
      DROP,
    ),
  ]),
  stats: [
    {
      key: 'drop',
      label: '直近 24 時間のドロップ率',
      level: 'unmeasured',
      levelLabel: '未計測',
      foot: '録画 36 件 / うち未計測 36 件',
    },
    {
      key: 'problem',
      label: '問題のある録画',
      level: 'unmeasured',
      levelLabel: '未計測',
      foot: '録画 36 件 / うち未計測 36 件',
    },
    {
      key: 'scramble',
      label: 'スクランブル残存率',
      level: 'unmeasured',
      levelLabel: '未計測',
      aside: '録画 36 件 / うち未計測 36 件',
    },
    {
      key: 'health',
      label: 'チューナーヘルス',
      value: '0 / 4',
      unit: '健全',
      level: 'unmeasured',
      levelLabel: '未計測 4 本',
      foot: '信号品質 未計測',
    },
  ],
  thresholds: THRESHOLDS,
  warnMarkPct: 20,
  channels: UNMEASURED_CHANNELS,
  satellites: UNMEASURED_SATELLITES,
  tuners: UNMEASURED_TUNERS,
  problemRecordings: [],
  supplies: { read: true, quiet: [] },
  anomalies: {
    items: [],
    owned: 0,
    restated: 0,
  },
}

const NOTHING_RECORDED = { level: 'nodata' } as const

export const SATELLITES_THAT_CANNOT_LOCK: QualityResult = {
  ...QUALITY,
  stats: QUALITY.stats.map((stat) =>
    stat.key === 'health'
      ? {
          key: 'health',
          label: 'チューナーヘルス',
          value: '0 / 3',
          unit: '健全',
          level: 'bad',
          levelLabel: '受信不可 2 本',
        }
      : stat,
  ),
  tuners: [
    {
      id: 'adapter0.frontend0',
      device: 'adapter0.frontend0',
      hardware: '録画 0 件',
      state: { level: 'bad', label: '受信不可' },
      drop: NOTHING_RECORDED,
      lock: NOT_SAMPLED,
      cnr: NOT_SAMPLED,
      ber: NOT_SAMPLED,
    },
    {
      id: 'adapter2.frontend0',
      device: 'adapter2.frontend0',
      hardware: '録画 0 件',
      state: { level: 'bad', label: '受信不可' },
      drop: NOTHING_RECORDED,
      lock: NOT_SAMPLED,
      cnr: NOT_SAMPLED,
      ber: NOT_SAMPLED,
    },
    {
      id: 'adapter3.frontend0',
      device: 'adapter3.frontend0',
      hardware: '録画 0 件',
      state: { level: 'warn', label: '警告水準' },
      drop: NOTHING_RECORDED,
      lock: { level: 'good', sub: '09/27 21:40 取得' },
      cnr: { level: 'good', sub: '09/27 21:40 取得' },
      ber: { level: 'warn', sub: '09/27 21:40 取得' },
    },
  ],
}

const FAILING_TO_TUNE =
  '選局に失敗したチャンネルがある。同じチャンネルで続けて失敗すると割り当てが止まる。'

export const SATELLITES_FAILING_TO_TUNE: QualityResult = {
  ...SATELLITES_THAT_CANNOT_LOCK,
  stats: QUALITY.stats.map((stat) =>
    stat.key === 'health'
      ? {
          key: 'health',
          label: 'チューナーヘルス',
          value: '1 / 3',
          unit: '健全',
          level: 'warn',
          levelLabel: '選局失敗 2 本',
        }
      : stat,
  ),
  tuners: [
    {
      id: 'adapter0.frontend0',
      device: 'adapter0.frontend0',
      hardware: '録画 0 件',
      state: { level: 'warn', label: '選局失敗', explanation: FAILING_TO_TUNE },
      drop: NOTHING_RECORDED,
      lock: NOT_SAMPLED,
      cnr: NOT_SAMPLED,
      ber: NOT_SAMPLED,
    },
    {
      id: 'adapter2.frontend0',
      device: 'adapter2.frontend0',
      hardware: '録画 0 件',
      state: { level: 'warn', label: '選局失敗', explanation: FAILING_TO_TUNE },
      drop: NOTHING_RECORDED,
      lock: NOT_SAMPLED,
      cnr: NOT_SAMPLED,
      ber: NOT_SAMPLED,
    },
    {
      id: 'adapter3.frontend0',
      device: 'adapter3.frontend0',
      hardware: '録画 0 件',
      state: { level: 'good', label: '健全' },
      drop: NOTHING_RECORDED,
      lock: { level: 'good', sub: '09/27 21:40 取得' },
      cnr: { level: 'good', sub: '09/27 21:40 取得' },
      ber: { level: 'good', sub: '09/27 21:40 取得' },
    },
  ],
  anomalies: {
    items: [
      {
        id: 'tune-failing-adapter0',
        title: 'チューナーの選局が失敗している',
        subject: 'adapter0.frontend0',
        observed: FAILING_TO_TUNE,
        level: 'warn',
        levelLabel: '警告水準',
        restatedBy: 'チューナー',
        classification: '選局失敗',
        when: '09/28 20:32 発生 · 継続中',
      },
    ],
    owned: 0,
    restated: 1,
  },
}

export const MORE_TUNERS_THAN_FIT: QualityResult = {
  ...QUALITY,
  tuners: Array.from({ length: 24 }, (_, index) => {
    const device = `adapter${Math.floor(index / 2) + 1}.frontend${index % 2}`

    return {
      ...QUALITY.tuners[index % QUALITY.tuners.length],
      id: device,
      device,
    }
  }),
}

export const ONE_RECORDING_IN_A_DAY: QualityResult = {
  ...QUALITY,
  windows: windows('24 時間'),
  trend: ONE_RECORDING_TREND,
}

export const OVER_THE_LINE: QualityResult = {
  ...QUALITY,
  trend: OVER_THE_LINE_TREND,
}

export const A_WEEK: QualityResult = {
  ...QUALITY,
  windows: windows('7 日'),
  trend: WEEK_TREND,
}

export const TWO_BROADCAST_DAYS: QualityResult = {
  ...QUALITY,
  trend: BROADCAST_DAYS_TREND,
}
