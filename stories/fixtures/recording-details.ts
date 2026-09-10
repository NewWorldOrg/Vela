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
    tunerUnit: {
      main: 'adapter0/frontend0',
    },
    eoverflow: '0 回',
    live: {
      elapsed: '0:42:18',
      written: '2.1 GB',
      drops: '36 パケット',
      rest: '0:21:42',
      updatedAt: '23:57:33',
    },
    thumbnailState: { main: '未生成' },
  },
  {
    ...base('1274'),
    reservationId: 'r-309',
    channelNo: '131',
    genres: ['バラエティ'],
    synopsis:
      '保存瓶の煮沸から常備菜の段取りまで、台所の一週間を整える30分。今週は夏野菜の作り置き特集。',
    outcomeBody: '書けた尺 30:04 / 予定 30:04 · 3.4 GB',
    reconcile: { size: '3.4 GB', written: '30:04', planned: '30:04' },
    interruptions: {
      main: '中断 0 回 / 再開 0 回',
    },
    tunerUnit: {
      main: 'adapter1/frontend0',
    },
    eoverflow: '0 回',
    scramble: {
      main: '0 パケット',
    },
    stopReason: '終了時刻に到達',
    thumbnailState: { main: '生成済み', sub: '抽出位置 120 秒' },
    qualityTotal: '0',
    qualityRatio: '0.0000',
  },
  {
    ...base('1270'),
    channelNo: '141',
    genres: ['アニメ'],
    outcomeBody: '書けた尺 30:00 / 予定 30:00 · 3.3 GB',
    reconcile: { size: '3.3 GB', written: '30:00', planned: '30:00' },
    interruptions: { main: '中断 0 回 / 再開 0 回' },
    tunerUnit: {
      main: 'adapter3/frontend0',
    },
    eoverflow: '0 回',
    scramble: { main: '0 パケット' },
    stopReason: '終了時刻に到達',
    thumbnailState: { main: '生成済み', sub: '抽出位置 120 秒' },
    qualityTotal: '0',
    qualityRatio: '0.0000',
  },
  {
    ...base('1266'),
    channelNo: '151',
    genres: ['スポーツ'],
    synopsis:
      '各都市の代表チームが知力で競う夏の恒例戦。準決勝は近似値クイズと早押しの二本立て。',
    outcomeBody: '書けた尺 4:12:38 / 予定 4:13:00 · 29.6 GB',
    reconcile: { size: '29.6 GB', written: '4:12:38', planned: '4:13:00' },
    interruptions: { main: '中断 0 回 / 再開 0 回' },
    tunerUnit: {
      main: 'adapter0/frontend0',
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
  },
  {
    ...base('1247'),
    reservationId: 'r-307',
    channelNo: '131',
    genres: ['バラエティ'],
    outcomeBody: '書けた尺 36:12 / 予定 54:00 · 4.2 GB',
    reconcile: { size: '4.2 GB', written: '36:12', planned: '54:00' },
    interruptions: {
      main: '中断 3 回 / 再開 2 回',
    },
    tunerUnit: {
      main: 'adapter1/frontend0',
    },
    eoverflow: '0 回',
    scramble: { main: '0 パケット' },
    stopReason: '競合により落とされた',
    thumbnailState: { main: '生成済み', sub: '抽出位置 120 秒' },
    qualityTotal: '0',
    qualityRatio: '0.0000',
  },
  {
    ...base('1239'),
    channelNo: '161',
    genres: ['バラエティ'],
    outcomeBody: '0 B · 00:15:04 – 00:15:21',
    interruptions: { main: '中断 0 回 / 再開 0 回' },
    tunerUnit: {
      main: 'adapter2/frontend0',
    },
    eoverflow: '0 回',
    scramble: {
      main: '18,203 パケット',
    },
    stopReason: '予期しない停止',
    failureReason: {
      title: 'スクランブル解除失敗',
      body: '閾値を超えた残存パケットを検出しました。',
      note: 'covered 0.9812 of the window',
      noticedAt: '08/02 00:15',
    },
    thumbnailState: { main: '録画が失敗したため作成されません' },
  },
  {
    ...base('0412'),
    channelNo: '171',
    genres: ['ドキュメンタリー'],
    outcomeBody: '書けた尺 30:00 / 予定 30:00 · 3.5 GB',
    reconcile: { size: '3.5 GB', written: '30:00', planned: '30:00' },
    interruptions: { main: '中断 0 回 / 再開 0 回' },
    eoverflow: '—',
    stopReason: '移行で取り込み(記録なし)',
    thumbnailState: { main: '生成済み', sub: '抽出位置 120 秒' },
  },
  {
    ...base('1198'),
    channelNo: '131',
    genres: ['映画', '邦画'],
    synopsis:
      '渡り鳥の観測小屋を営む青年と、星の写真を撮りに来た旅人。ひと夏の岬を舞台に、去る者と残る者のすれ違いを描く劇場公開作をテレビ初放送。',
    outcomeBody: '書けた尺 2:06:14 / 予定 2:06:14 · 13.8 GB',
    reconcile: { size: '13.8 GB', written: '2:06:14', planned: '2:06:14' },
    interruptions: { main: '中断 0 回 / 再開 0 回' },
    tunerUnit: {
      main: 'adapter1/frontend0',
    },
    eoverflow: '2 回',
    scramble: { main: '0 パケット' },
    stopReason: '終了時刻に到達',
    thumbnailState: { main: '生成失敗' },
    qualityTotal: '178,530',
    qualityRatio: '0.227',
    qualitySpots: [
      { at: '21:41 付近', packets: '171,204 パケット', second: 1_560 },
      { at: '21:58 付近', packets: '7,326 パケット', second: 2_580 },
    ],
  },
  {
    ...base('0906'),
    channelNo: '091',
    genres: ['音楽'],
    outcomeBody: '書けた尺 30:00 / 予定 30:00 · 1.3 GB',
    reconcile: { size: '1.3 GB', written: '30:00', planned: '30:00' },
    interruptions: { main: '中断 0 回 / 再開 0 回' },
    tunerUnit: {
      main: 'adapter2/frontend0',
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
    outcomeBody: '書けた尺 30:04 / 予定 30:00 · 実ファイルなし',
    interruptions: { main: '中断 0 回 / 再開 0 回' },
    eoverflow: '—',
    stopReason: '移行で取り込み(記録なし)',
    thumbnailState: { main: '未生成' },
  },
]
