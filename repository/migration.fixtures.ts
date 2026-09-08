import type { MigrationResult } from '@/repository/migration'

export const MIGRATION: MigrationResult = {
  run: {
    heading: '2026/08/10 03:12 の実行',
    kind: '本番',
    rehearsals: '下見 4 回',
    startedAt: '2026/08/10 03:12',
    finishedAt: '2026/08/10 03:18',
    duration: '所要 6分42秒',
    source:
      '旧録画システムのデータベース(読み取り専用接続)/ 出力ディレクトリ /srv/legacy/recorded',
    lastRehearsal: '2026/08/09 22:41',
  },
  populations: [
    {
      name: '録画',
      source: 'recorded',
      total: '53',
      unit: '本',
      taken: '51',
      notTaken: '2',
      unclassified: '0',
      link: { href: '/library', label: 'ライブラリへ' },
    },
    {
      name: '録画ファイル',
      source: 'video_file + 出力ディレクトリ',
      total: '58',
      unit: '件',
      taken: '51',
      notTaken: '7',
      unclassified: '0',
    },
    {
      name: 'ルール',
      source: 'rule',
      total: '17',
      unit: '件',
      taken: '16',
      notTaken: '1',
      unclassified: '0',
      link: { href: '/reservations/rules', label: 'ルール一覧へ' },
    },
    {
      name: '予約',
      source: 'reserve',
      total: '14',
      unit: '件',
      taken: '0',
      notTaken: '14',
      unclassified: '0',
    },
    {
      name: 'チャンネル定義',
      source: 'channel',
      total: '39',
      unit: '件',
      taken: '35',
      notTaken: '4',
      unclassified: '0',
    },
  ],
  unclassified: '0',
  notTakenGroups: [
    {
      name: '実 0 バイト',
      count: '2',
      unit: '件',
      rows: [
        {
          id: 'nt-1',
          subject: 'recorded id 118',
          population: '録画',
          fact: '記録されたサイズに対して実ファイルが空',
          size: '0 B(記録上 17,171,113,480 B)',
        },
        {
          id: 'nt-2',
          subject: 'recorded id 204',
          population: '録画',
          fact: '記録されたサイズに対して実ファイルが空',
          size: '0 B(記録上 5,208,028,640 B)',
        },
      ],
    },
    {
      name: 'ファイル不在',
      count: '1',
      unit: '件',
      rows: [
        {
          id: 'nt-3',
          subject: 'video_file id 233',
          population: '録画ファイル',
          fact: '台帳に行があるが実ファイルが無い',
        },
      ],
    },
    {
      name: '孤児',
      count: '5',
      unit: '件',
      rows: [
        {
          id: 'nt-4',
          subject: '2026-05-03_23-00-00.m2ts.tmp',
          population: '録画ファイル',
          fact: '対応する台帳の行が無い',
          size: '2,514,911,344 B',
        },
        {
          id: 'nt-5',
          subject: '2026-06-17_01-30-00.m2ts.tmp',
          population: '録画ファイル',
          fact: '対応する台帳の行が無い',
          size: '41,238,528 B',
        },
        {
          id: 'nt-6',
          subject: '2026-02-11_19-00-00.m2ts',
          population: '録画ファイル',
          fact: '対応する台帳の行が無い',
          size: '0 B',
        },
        {
          id: 'nt-7',
          subject: '2026-01-24_21-00-00.m2ts',
          population: '録画ファイル',
          fact: '対応する台帳の行が無い',
          size: '727,013,296 B',
        },
        {
          id: 'nt-8',
          subject: 'bash.sh',
          population: '録画ファイル',
          fact: '録画ではないファイルが出力ルートにある',
          size: '539 B',
        },
      ],
    },
    {
      name: '同定不能',
      count: '2',
      unit: '件',
      rows: [
        {
          id: 'nt-9',
          subject: 'rule id 12',
          population: 'ルール',
          fact: '参照しているチャンネルが再スキャン結果に無い',
        },
        {
          id: 'nt-10',
          subject: 'channel id 27',
          population: 'チャンネル定義',
          fact: '再スキャン結果と対応が付かない',
        },
      ],
    },
    {
      name: '型として表現不能',
      count: '3',
      unit: '件',
      rows: [
        {
          id: 'nt-11',
          subject: 'channel id 40',
          population: 'チャンネル定義',
          fact: 'この種別は本システムの型に存在しない',
        },
        {
          id: 'nt-12',
          subject: 'channel id 41',
          population: 'チャンネル定義',
          fact: 'この種別は本システムの型に存在しない',
        },
        {
          id: 'nt-13',
          subject: 'channel id 42',
          population: 'チャンネル定義',
          fact: 'この種別は本システムの型に存在しない',
        },
      ],
    },
    {
      name: '本システムに機能が無い',
      count: '0',
      unit: '件',
      rows: [],
      empty: '該当なし',
    },
    {
      name: '対象外',
      count: '14',
      unit: '件',
      rows: Array.from({ length: 14 }, (_, index) => ({
        id: `nt-${14 + index}`,
        subject: `reserve id ${41 + index}`,
        population: '予約',
        fact: 'ルール由来のため移行しない',
      })),
    },
  ],
  omissions: [
    {
      id: 'programmeGuide',
      tag: '移行しない',
      title: '番組表',
      count: '3,557',
      unit: '行',
    },
    {
      id: 'duplicateAvoidance',
      tag: '移行しない',
      title: 'ルールの重複録画防止',
    },
    {
      id: 'qualityTimeSeries',
      tag: '対象が存在しない',
      title: '品質時系列',
    },
    {
      id: 'recordingHistory',
      tag: '移行しない',
      title: '重複録画防止の履歴',
    },
    {
      id: 'enclosedCharacters',
      tag: '移行しない',
      title: '番組名の囲み文字の置換',
      count: '38',
      unit: '本',
    },
  ],
}

export const MIGRATION_REHEARSAL: MigrationResult = {
  ...MIGRATION,
  run: {
    ...MIGRATION.run,
    kind: '下見',
    rehearsals: '下見なし',
    lastRehearsal: '—',
  },
}

export const MORE_NOT_TAKEN_THAN_FIT: MigrationResult = {
  ...MIGRATION,
  notTakenGroups: MIGRATION.notTakenGroups.map((group) => ({
    ...group,
    count: String(group.rows.length * 8),
    rows: Array.from({ length: 8 }, (_, round) =>
      group.rows.map((row) => ({
        ...row,
        id: `${row.id}-${round}`,
        subject: `${row.subject} (${round + 1})`,
      })),
    ).flat(),
  })),
}
