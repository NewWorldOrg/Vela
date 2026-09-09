import type { MigrationResult } from '@/repository/migration'

export const MIGRATION: MigrationResult = {
  run: {
    heading: '2026/08/10 03:12 の実行',
    kind: '本番',
    rehearsals: '下見 4 回',
    startedAt: '2026/08/10 03:12',
    finishedAt: '2026/08/10 03:18',
    duration: '所要 6分42秒',
    source: '現行の録画システム',
    lastRehearsal: '2026/08/09 22:41',
  },
  populations: [
    {
      name: '録画',
      source: 'recorded',
      total: '31',
      unit: '本',
      taken: '29',
      notTaken: '2',
      unclassified: '0',
      link: { href: '/library', label: 'ライブラリへ' },
    },
    {
      name: '録画ファイル',
      source: 'video_file + 出力ディレクトリ',
      total: '35',
      unit: '件',
      taken: '29',
      notTaken: '6',
      unclassified: '0',
    },
    {
      name: 'ルール',
      source: 'rule',
      total: '8',
      unit: '件',
      taken: '7',
      notTaken: '1',
      unclassified: '0',
      link: { href: '/reservations/rules', label: 'ルール一覧へ' },
    },
    {
      name: '予約',
      source: 'reserve',
      total: '9',
      unit: '件',
      taken: '0',
      notTaken: '9',
      unclassified: '0',
    },
    {
      name: 'チャンネル定義',
      source: 'channel',
      total: '12',
      unit: '件',
      taken: '9',
      notTaken: '3',
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
          subject: '2026年04月06日22時00分00秒-真夜中の音楽室[字].m2ts',
          population: '録画',
          fact: '記録されたサイズに対して実ファイルが空',
          size: '0 B(記録上 3,000,000,000 B)',
        },
        {
          id: 'nt-2',
          subject: '2026年04月13日22時00分00秒-真夜中の音楽室[字].m2ts',
          population: '録画',
          fact: '記録されたサイズに対して実ファイルが空',
          size: '0 B(記録上 3,000,000,000 B)',
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
          subject: '2026年03月29日11時30分00秒-週末キッチンの手帖.m2ts',
          population: '録画ファイル',
          fact: '台帳に行があるが実ファイルが無い',
        },
      ],
    },
    {
      name: '孤児',
      count: '4',
      unit: '件',
      rows: [
        {
          id: 'nt-4',
          subject: '2026年05月03日23時00分00秒-夜ふかしラジオ倶楽部.m2ts.tmp',
          population: '録画ファイル',
          fact: '対応する台帳の行が無い',
          size: '2,000,000,000 B',
        },
        {
          id: 'nt-5',
          subject: '2026年06月17日01時30分00秒-夜ふかしラジオ倶楽部.m2ts.tmp',
          population: '録画ファイル',
          fact: '対応する台帳の行が無い',
          size: '40,000,000 B',
        },
        {
          id: 'nt-6',
          subject: '2026年02月11日19時00分00秒-週末キッチンの手帖.m2ts',
          population: '録画ファイル',
          fact: '対応する台帳の行が無い',
          size: '0 B',
        },
        {
          id: 'nt-7',
          subject: 'notes.txt',
          population: '録画ファイル',
          fact: '録画ではないファイルが出力ルートにある',
          size: '500 B',
        },
      ],
    },
    {
      name: '同定不能',
      count: '2',
      unit: '件',
      rows: [
        {
          id: 'nt-8',
          subject: '真夜中の音楽室',
          population: 'ルール',
          fact: '参照しているチャンネルが再スキャン結果に無い',
        },
        {
          id: 'nt-9',
          subject: 'とおい街のラジオ',
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
          id: 'nt-10',
          subject: 'そらいろ通信',
          population: 'チャンネル定義',
          fact: 'この種別は本システムの型に存在しない',
        },
        {
          id: 'nt-11',
          subject: 'みなとチャンネル',
          population: 'チャンネル定義',
          fact: 'この種別は本システムの型に存在しない',
        },
        {
          id: 'nt-12',
          subject: 'こもれびテレビ',
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
      count: '9',
      unit: '件',
      rows: Array.from({ length: 9 }, (_, index) => ({
        id: `nt-${13 + index}`,
        subject: `週末キッチンの手帖　第${index + 1}回`,
        population: '予約',
        fact: 'ルール由来のため移行しない',
      })),
    },
  ],
  losses: [
    {
      id: 'duplicateAvoidance',
      subject: 'ルールの重複録画防止',
      fact: '運んだ 7 件のルールがこの設定を失った',
    },
    {
      id: 'enclosedCharacters',
      subject: '番組名の囲み文字',
      fact: '運んだ 24 本の題名が元の文字に戻せない',
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

export const NOTHING_LOST: MigrationResult = {
  ...MIGRATION,
  losses: [],
}
