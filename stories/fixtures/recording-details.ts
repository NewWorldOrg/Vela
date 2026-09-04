import type { RecordingDetail } from '@/repository/recordings'
import { RECORDING_FIXTURES } from '@/stories/fixtures/recordings'

function base(id: string) {
  const found = RECORDING_FIXTURES.find((r) => r.id === id)
  if (!found) {
    throw new Error(`fixture ${id} not found`)
  }
  return found
}

export const RECORDING_DETAIL_FIXTURES: RecordingDetail[] = [
  {
    ...base('1291'),
    reservationId: 'r-310',
    channelNo: '181',
    genres: ['バラエティ'],
    avInfo: '1080i · ステレオ · 字幕あり',
    tunerUnit: {
      main: 'adapter0/frontend0',
      sub: '地上 · セッション rec-20260810-2315-181',
    },
    eoverflow: '0 回',
    live: {
      elapsed: '0:42:18',
      written: '2.1 GB',
      drops: '36 パケット',
      rest: '0:21:42',
      updatedAt: '23:57:33',
      extension: {
        plannedEnd: '24:15',
        currentEnd: '24:19',
        delta: '後方へ 4 分',
        followedAt: '23:41:52',
      },
    },
    thumbnailState: { main: '未生成' },
  },
  {
    ...base('1274'),
    reservationId: 'r-309',
    channelNo: '131',
    genres: ['バラエティ'],
    avInfo: '1080i · ステレオ · 字幕あり',
    synopsis:
      '保存瓶の煮沸から常備菜の段取りまで、台所の一週間を整える30分。今週は夏野菜の作り置き特集。',
    outcomeBody: '書けた尺 30:04 / 予定 30:04 · 3.4 GB',
    reconcile: { size: '3.4 GB', written: '30:04', planned: '30:04' },
    interruptions: {
      main: '中断 0 回 / 再開 0 回',
    },
    tunerUnit: {
      main: 'adapter1/frontend0',
      sub: '地上 · セッション rec-20260809-2300-131',
    },
    eoverflow: '0 回',
    scramble: {
      main: '0 パケット',
    },
    stopReason: '終了時刻に到達',
    thumbnailState: { main: '生成済み', sub: '抽出位置 120 秒' },
    qualityTotal: '0',
    qualityRatio: '0.0000',
    encodePanel: {
      profile: '録画再生用(H.264)',
      sourceSize: '3.4 GB',
      outSize: '0.8 GB',
      savings: '−76%',
      doneSub:
        'プロファイル 録画再生用(H.264) · 08/10(日) 03:24 完了 · 処理時間 21分 · 元 TS は保持中',
    },
  },
  {
    ...base('1270'),
    channelNo: '141',
    genres: ['アニメ'],
    avInfo: '1080i · ステレオ · 字幕あり',
    outcomeBody: '書けた尺 30:00 / 予定 30:00 · 3.3 GB',
    reconcile: { size: '3.3 GB', written: '30:00', planned: '30:00' },
    interruptions: { main: '中断 0 回 / 再開 0 回' },
    tunerUnit: {
      main: 'adapter3/frontend0',
      sub: '地上 · セッション rec-20260809-0105-141',
    },
    eoverflow: '0 回',
    scramble: { main: '0 パケット' },
    stopReason: '終了時刻に到達',
    thumbnailState: { main: '生成済み', sub: '抽出位置 120 秒' },
    qualityTotal: '0',
    qualityRatio: '0.0000',
    encodePanel: {
      profile: '録画再生用(H.264)',
      progressPct: 42,
      progressSub: '42% · 残り およそ 12 分 · 直近の平均所要 21分',
    },
  },
  {
    ...base('1266'),
    channelNo: '151',
    genres: ['スポーツ'],
    avInfo: '1080i · ステレオ · 字幕あり',
    synopsis:
      '各都市の代表チームが知力で競う夏の恒例戦。準決勝は近似値クイズと早押しの二本立て。',
    outcomeBody: '書けた尺 4:12:38 / 予定 4:13:00 · 29.6 GB',
    reconcile: { size: '29.6 GB', written: '4:12:38', planned: '4:13:00' },
    interruptions: { main: '中断 0 回 / 再開 0 回' },
    tunerUnit: {
      main: 'adapter0/frontend0',
      sub: '地上 · セッション rec-20260808-1230-151',
    },
    eoverflow: '0 回',
    scramble: { main: '0 パケット' },
    stopReason: '終了時刻に到達',
    thumbnailState: { main: '生成済み', sub: '抽出位置 120 秒' },
    qualityTotal: '38,412',
    qualityRatio: '0.023',
    qualitySpots: [
      { at: '13:12 付近', packets: '36,980 パケット', second: 2_580 },
      { at: '15:44 付近', packets: '1,432 パケット', second: 11_100 },
    ],
    seek: {
      cmSpans: [
        { leftPct: 12.4, widthPct: 5.2 },
        { leftPct: 34.8, widthPct: 4.6 },
        { leftPct: 58.1, widthPct: 5.4 },
        { leftPct: 80.3, widthPct: 4.9 },
      ],
      chapterPcts: [12.4, 17.6, 34.8, 39.4, 58.1, 63.5, 80.3, 85.2],
    },
    encodePanel: {
      profile: '録画再生用(H.264)',
      sourceSize: '29.6 GB',
      outSize: '6.8 GB',
      savings: '−77%',
      doneSub:
        'プロファイル 録画再生用(H.264) · 08/09(土) 05:02 完了 · 処理時間 2時間48分 · 元 TS は保持中',
    },
  },
  {
    ...base('1247'),
    reservationId: 'r-307',
    channelNo: '131',
    genres: ['バラエティ'],
    avInfo: '1080i · ステレオ · 字幕あり',
    outcomeBody: '書けた尺 36:12 / 予定 54:00 · 4.2 GB',
    reconcile: { size: '4.2 GB', written: '36:12', planned: '54:00' },
    interruptions: {
      main: '中断 3 回 / 再開 2 回',
    },
    tunerUnit: {
      main: 'adapter1/frontend0',
      sub: '地上 · セッション rec-20260804-2300-131',
    },
    eoverflow: '0 回',
    scramble: { main: '0 パケット' },
    stopReason: '競合により落とされた',
    thumbnailState: { main: '生成済み', sub: '抽出位置 120 秒' },
    qualityTotal: '0',
    qualityRatio: '0.0000',
    encodePanel: {
      profile: '録画再生用(H.264)',
      queueSub: '待機列の 2 番目です。',
      registeredAt: '08/04(月) 23:40',
    },
  },
  {
    ...base('1239'),
    channelNo: '161',
    genres: ['バラエティ'],
    avInfo: '—',
    outcomeBody: '0 B · 00:15:04 – 00:15:21',
    interruptions: { main: '中断 0 回 / 再開 0 回' },
    tunerUnit: {
      main: 'adapter2/frontend0',
      sub: '地上 · セッション rec-20260802-0015-161',
    },
    eoverflow: '0 回',
    scramble: {
      main: '18,203 パケット',
    },
    stopReason: '予期しない停止',
    failureReason: {
      title: 'スクランブル解除失敗',
      body: '閾値を超えた残存パケットを検出しました。',
    },
    thumbnailState: { main: '録画が失敗したため作成されません' },
  },
  {
    ...base('0412'),
    channelNo: '171',
    genres: ['ドキュメンタリー'],
    avInfo: '1080i · ステレオ · 字幕あり',
    outcomeBody: '書けた尺 30:00 / 予定 30:00 · 3.5 GB',
    reconcile: { size: '3.5 GB', written: '30:00', planned: '30:00' },
    interruptions: { main: '中断 0 回 / 再開 0 回' },
    eoverflow: '—',
    stopReason: '移行で取り込み(記録なし)',
    thumbnailState: { main: '生成済み', sub: '抽出位置 120 秒' },
    encodePanel: {
      profile: '録画再生用(H.264)',
      queueSub: '待機列の 5 番目です。',
      registeredAt: '08/10(日) 04:05',
    },
  },
  {
    ...base('1198'),
    channelNo: '131',
    genres: ['映画', '邦画'],
    avInfo: '1080i · ステレオ · 字幕あり',
    synopsis:
      '渡り鳥の観測小屋を営む青年と、星の写真を撮りに来た旅人。ひと夏の岬を舞台に、去る者と残る者のすれ違いを描く劇場公開作をテレビ初放送。',
    outcomeBody: '書けた尺 2:06:14 / 予定 2:06:14 · 13.8 GB',
    reconcile: { size: '13.8 GB', written: '2:06:14', planned: '2:06:14' },
    interruptions: { main: '中断 0 回 / 再開 0 回' },
    tunerUnit: {
      main: 'adapter1/frontend0',
      sub: '地上 · セッション rec-20260725-2100-131',
    },
    eoverflow: '2 回',
    scramble: { main: '0 パケット' },
    stopReason: '終了時刻に到達',
    thumbnailState: {
      main: '生成失敗',
      canGenerate: true,
    },
    qualityTotal: '178,530',
    qualityRatio: '0.227',
    qualitySpots: [
      { at: '21:41 付近', packets: '171,204 パケット', second: 1_560 },
      { at: '21:58 付近', packets: '7,326 パケット', second: 2_580 },
    ],
    encodePanel: { profile: '録画再生用(H.264)', attempts: '2 回 / 上限 3 回' },
  },
  {
    ...base('0906'),
    channelNo: '091',
    genres: ['音楽'],
    avInfo: '1080i · ステレオ',
    outcomeBody: '書けた尺 30:00 / 予定 30:00 · 1.3 GB',
    reconcile: { size: '1.3 GB', written: '30:00', planned: '30:00' },
    interruptions: { main: '中断 0 回 / 再開 0 回' },
    tunerUnit: {
      main: 'adapter2/frontend0',
      sub: '地上 · セッション rec-20250906-2100-091',
    },
    eoverflow: '0 回',
    scramble: {
      main: '5,042,768 パケット',
    },
    scrambledShare: 5_042_768 / 5_302_549,
    stopReason: '終了時刻に到達',
    thumbnailState: { main: '生成済み', sub: '抽出位置 120 秒' },
    qualityTotal: '0',
    qualityRatio: '0.0000',
  },
  {
    ...base('0731'),
    channelNo: '131',
    genres: ['ドキュメンタリー'],
    avInfo: '1080i · ステレオ · 字幕あり',
    outcomeBody: '書けた尺 30:04 / 予定 30:00 · 実ファイルなし',
    interruptions: { main: '中断 0 回 / 再開 0 回' },
    eoverflow: '—',
    stopReason: '移行で取り込み(記録なし)',
    thumbnailState: { main: '未生成' },
  },
]
