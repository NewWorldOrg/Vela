import type { Route } from 'next'

import type { QualityLevel } from '@/lib/quality'
import { QUALITY_LEVEL_LABEL } from '@/lib/quality'
import type {
  QualityAnomaly,
  QualityChannel,
  QualityResult,
  QualityThreshold,
  QualityTrend,
  QualityTrendBucket,
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
    basis: '既定 0.02% · 根拠 4,320 件',
    shipped: '0.02%',
    provisional: true,
    amount: '0.02',
    unit: '%',
    lowest: 0,
    highest: 100,
  },
  {
    key: 'packetsLostUnwatchable',
    label: 'ドロップ率の視聴不可の恐れ',
    value: '0.1%',
    basis: '既定 0.1% · 根拠 4,320 件',
    shipped: '0.1%',
    provisional: true,
    amount: '0.1',
    unit: '%',
    lowest: 0,
    highest: 100,
  },
  {
    key: 'packetsLeftScrambled',
    label: 'スクランブル残存率の上限',
    value: '0.05%',
    basis: '既定 0.05% · 根拠 4,320 件',
    shipped: '0.05%',
    provisional: true,
    amount: '0.05',
    unit: '%',
    lowest: 0,
    highest: 100,
  },
  {
    key: 'packetsLeftScrambledUnwatchable',
    label: 'スクランブル残存率の視聴不可の恐れ',
    value: '1%',
    basis: '既定 1% · 根拠 4,320 件',
    shipped: '1%',
    provisional: true,
    amount: '1',
    unit: '%',
    lowest: 0,
    highest: 100,
  },
  {
    key: 'overflows',
    label: '取りこぼしの上限',
    value: '1回',
    basis: '既定 1回 · 根拠 4,320 件',
    shipped: '1回',
    provisional: true,
    amount: '1',
    unit: '回',
    lowest: 0,
    highest: 1000000,
  },
  {
    key: 'lockRate',
    label: 'lock 率の下限',
    value: '99%',
    basis: '既定 99% · 根拠 0 件',
    shipped: '99%',
    provisional: true,
    amount: '99',
    unit: '%',
    lowest: 0,
    highest: 100,
  },
  {
    key: 'carrierToNoiseFloor',
    label: 'CNR の下限',
    value: '15dB',
    basis: '既定 15dB · 根拠 0 件',
    shipped: '15dB',
    provisional: true,
    amount: '15',
    unit: 'dB',
    lowest: -100,
    highest: 100,
  },
  {
    key: 'bitErrorRateCeiling',
    label: 'post-Viterbi ビット誤り率の上限',
    value: '1.0e-4',
    basis: '既定 1.0e-4 · 根拠 0 件',
    shipped: '1.0e-4',
    provisional: true,
    amount: '0.0001',
    unit: '',
    lowest: 0,
    highest: 1,
  },
  {
    key: 'supplySilence',
    label: '供給途絶の判定',
    value: '5分',
    basis: '既定 5分 · 根拠 0 件',
    shipped: '5分',
    provisional: true,
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
    applied: '適用閾値 0.1%(暫定)',
    level: 'bad',
    levelLabel: '視聴不可の恐れ',
    when: '08/09 21:00 発生 · 継続中',
  },
  {
    id: 'anomaly-2',
    title: '信号品質の供給途絶',
    subject: 'adapter0.frontend0',
    observed: '途絶 10分',
    applied: '適用閾値 5分(暫定)',
    level: 'unreachable',
    levelLabel: '取得できず',
    when: '08/10 09:34 発生 · 継続中',
  },
  {
    id: 'anomaly-3',
    title: 'lock 率が下限を下回った',
    subject: 'adapter2.frontend0',
    observed: '観測 62%',
    applied: '適用閾値 99%(暫定)',
    level: 'warn',
    levelLabel: '警告水準',
    restatedBy: '再掲 · チューナー',
    classification: '① 信号を掴めない',
    when: '08/09 18:41 発生 · 継続中',
  },
]

const TREND_SUBJECTS = [
  { label: 'ドロップ率', subject: 'packetsLost' },
  { label: 'スクランブル残存率', subject: 'packetsLeftScrambled' },
  { label: 'lock 率', subject: 'lockRate' },
  { label: 'CNR', subject: 'carrierToNoise' },
  { label: 'post-Viterbi ビット誤り率', subject: 'bitErrorRate' },
]

const trendSubjects = (current: string) =>
  TREND_SUBJECTS.map((one) => ({
    label: one.label,
    href: `/settings/quality?days=1&subject=${one.subject}` as Route,
    current: one.label === current,
  }))

const hour = (at: number) => `09/08 ${String(at).padStart(2, '0')}:00`

const hours = (
  levels: QualityLevel[],
  worst: (at: number) => string,
): QualityTrendBucket[] =>
  levels.map((level, at) => ({
    key: hour(at),
    level,
    says: [
      `${hour(at)}〜${hour(at + 1)}`,
      QUALITY_LEVEL_LABEL[level],
      ...(level === 'good' || level === 'warn' ? [`最悪 ${worst(at)}`] : []),
    ].join(' · '),
  }))

const spread = (pattern: string): QualityLevel[] =>
  [...pattern].map((one) =>
    one === 'g'
      ? 'good'
      : one === 'w'
        ? 'warn'
        : one === 'x'
          ? 'unreachable'
          : one === 'u'
            ? 'unmeasured'
            : 'nodata',
  )

const cnr = (at: number) => `${30 + (at % 4)}dB`

export const SIGNAL_TREND: QualityTrend = {
  subjects: trendSubjects('CNR'),
  rows: [
    {
      key: 'whole',
      name: '全体',
      buckets: hours(spread('ggggww..ggggggxgggggg...'), cnr),
    },
    {
      key: '32736-1024',
      name: 'みなと総合1',
      buckets: hours(spread('gg..ww....gggg.x....gg..'), cnr),
    },
    {
      key: '32737-1032',
      name: '中央テレビ1',
      buckets: hours(spread('..gg......gg....gggg....'), cnr),
    },
    {
      key: '32738-1040',
      name: 'みなと教育1',
      buckets: hours(spread('........................'), cnr),
    },
  ],
  from: '09/08 00:00',
  until: '09/09 00:00',
  provisional: true,
}

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
      aside: '閾値は暫定',
      foot: '録画 14 本 / うち未計測 3 本',
    },
    {
      key: 'problem',
      label: '問題のある録画',
      value: '2',
      unit: '件',
      level: 'bad',
      levelLabel: '視聴不可の恐れ',
      link: { href: '/library', label: 'ライブラリで絞り込む' },
    },
    {
      key: 'scramble',
      label: 'スクランブル残存率',
      value: '0.000',
      unit: '%',
      level: 'good',
      levelLabel: '良好',
      aside: '録画 11 本を計測',
    },
    {
      key: 'health',
      label: 'チューナーヘルス',
      value: '3 / 4',
      unit: '健全',
      link: { href: '/settings/tuners', label: 'チューナーへ' },
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
      note: '録画 2 本を計測',
    },
    {
      id: '32737-1032',
      name: '中央テレビ1',
      no: '131',
      dropRate: '0.031%',
      barPct: 31,
      level: 'warn',
      note: '録画 1 本を計測',
    },
    {
      id: '32738-1040',
      name: 'みなと教育1',
      no: '191',
      dropRate: '0.002%',
      barPct: 2,
      level: 'good',
      note: '録画 3 本を計測',
    },
    {
      id: '32739-1048',
      name: '東都テレビ1',
      no: '161',
      dropRate: '0.003%',
      barPct: 3,
      level: 'good',
      note: '録画 2 本を計測',
    },
    {
      id: '32740-1056',
      name: '湾岸放送1',
      no: '171',
      dropRate: '0.002%',
      barPct: 2,
      level: 'good',
      note: '録画 2 本を計測',
    },
    {
      id: '32741-1064',
      name: '第一テレビ1',
      no: '181',
      dropRate: '0.006%',
      barPct: 6,
      level: 'good',
      note: '録画 1 本を計測',
    },
    {
      id: '32742-1072',
      name: 'シティ MX1',
      no: '141',
      level: 'unmeasured',
      note: '録画 3 本 / うち未計測 3 本',
    },
  ],
  satellites: [],
  tuners: [
    {
      id: 'adapter1.frontend0',
      device: 'adapter1.frontend0',
      hardware: '録画 9 本を計測',
      state: { level: 'good', label: '健全' },
      drop: { value: '0.002', unit: '%', level: 'good' },
      lock: NOT_SAMPLED,
      cnr: NOT_SAMPLED,
      ber: NOT_SAMPLED,
    },
    {
      id: 'adapter1.frontend1',
      device: 'adapter1.frontend1',
      hardware: '録画 4 本を計測',
      state: { level: 'good', label: '健全' },
      drop: { value: '0.001', unit: '%', level: 'good' },
      lock: NOT_SAMPLED,
      cnr: NOT_SAMPLED,
      ber: NOT_SAMPLED,
    },
    {
      id: 'adapter3.frontend0',
      device: 'adapter3.frontend0',
      hardware: '録画 2 本を計測',
      state: { level: 'bad', label: '視聴不可の恐れ' },
      drop: { value: '0.152', unit: '%', level: 'bad' },
      lock: NOT_SAMPLED,
      cnr: NOT_SAMPLED,
      ber: NOT_SAMPLED,
    },
    {
      id: 'adapter3.frontend1',
      device: 'adapter3.frontend1',
      hardware: '録画 3 本 / うち未計測 3 本',
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
    },
    {
      id: 'rec-2',
      title: '夕方いちばん',
      where: '中央テレビ1 · 08/10 08:15',
      drops: 'ドロップ 812',
      pct: '0.031%',
      level: 'warn',
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
    owned: 2,
    restated: 1,
  },
}

export const NOTHING_MEASURED: QualityResult = {
  windows: windows('30 日'),
  trend: {
    subjects: trendSubjects('ドロップ率'),
    rows: [
      {
        key: 'whole',
        name: '全体',
        buckets: hours(spread('..............................'), cnr),
      },
    ],
    from: '08/10 04:00',
    until: '09/09 04:00',
    provisional: true,
  },
  stats: [
    {
      key: 'drop',
      label: '直近 30 日のドロップ率',
      level: 'unmeasured',
      levelLabel: '未計測',
      aside: '閾値は暫定',
      foot: '録画 0 本',
    },
    {
      key: 'problem',
      label: '問題のある録画',
      value: '0',
      unit: '件',
      link: { href: '/library', label: 'ライブラリで絞り込む' },
    },
    {
      key: 'scramble',
      label: 'スクランブル残存率',
      level: 'unmeasured',
      levelLabel: '未計測',
      aside: '録画 0 本',
    },
    {
      key: 'health',
      label: 'チューナーヘルス',
      level: 'nodata',
      levelLabel: '対象なし',
      link: { href: '/settings/tuners', label: 'チューナーへ' },
      foot: '信号品質 未計測',
    },
  ],
  thresholds: THRESHOLDS.map((one) => ({
    ...one,
    basis: one.basis.replace(/根拠 [\d,]+ 件/, '根拠 0 件'),
  })),
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
  note: `録画 ${recordings} 本 / うち未計測 ${recordings} 本`,
}))

const UNMEASURED_SATELLITES: QualityChannel[] = [
  { id: '4-16400', name: 'みなと BS1', no: '211', recordings: 4 },
  { id: '4-16401', name: '東都 BS1', no: '231', recordings: 2 },
].map(({ recordings, ...channel }): QualityChannel => ({
  ...channel,
  level: 'unmeasured',
  note: `録画 ${recordings} 本 / うち未計測 ${recordings} 本`,
}))

const UNMEASURED_TUNERS: QualityTuner[] = [
  { device: 'adapter1.frontend0', recordings: 9 },
  { device: 'adapter1.frontend1', recordings: 8 },
  { device: 'adapter3.frontend0', recordings: 7 },
  { device: 'adapter3.frontend1', recordings: 12 },
].map(({ device, recordings }): QualityTuner => ({
  id: device,
  device,
  hardware: `録画 ${recordings} 本 / うち未計測 ${recordings} 本`,
  state: { level: 'unmeasured', label: '未計測' },
  drop: NOT_SAMPLED,
  lock: NOT_SAMPLED,
  cnr: NOT_SAMPLED,
  ber: NOT_SAMPLED,
}))

export const EVERY_ROW_UNMEASURED: QualityResult = {
  windows: windows('24 時間'),
  trend: {
    subjects: trendSubjects('ドロップ率'),
    rows: [
      {
        key: 'whole',
        name: '全体',
        buckets: hours(spread('uuuuuuuuuuuuuuuuuuuuuuuu'), cnr),
      },
      {
        key: '32736-1024',
        name: 'みなと総合1',
        buckets: hours(spread('uuuuuuuuuuuuuuuuuuuuuuuu'), cnr),
      },
    ],
    from: '09/08 00:00',
    until: '09/09 00:00',
    provisional: true,
  },
  stats: [
    {
      key: 'drop',
      label: '直近 24 時間のドロップ率',
      level: 'unmeasured',
      levelLabel: '未計測',
      aside: '閾値は暫定',
      foot: '録画 36 本 / うち未計測 36 本',
    },
    {
      key: 'problem',
      label: '問題のある録画',
      level: 'unmeasured',
      levelLabel: '未計測',
      link: { href: '/library', label: 'ライブラリで絞り込む' },
      foot: '録画 36 本 / うち未計測 36 本',
    },
    {
      key: 'scramble',
      label: 'スクランブル残存率',
      level: 'unmeasured',
      levelLabel: '未計測',
      aside: '録画 36 本 / うち未計測 36 本',
    },
    {
      key: 'health',
      label: 'チューナーヘルス',
      level: 'unmeasured',
      levelLabel: '未計測',
      link: { href: '/settings/tuners', label: 'チューナーへ' },
      foot: '信号品質 未計測',
    },
  ],
  thresholds: THRESHOLDS.map((one) => ({
    ...one,
    basis: one.basis.replace(/根拠 [\d,]+ 件/, '根拠 0 件'),
  })),
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
