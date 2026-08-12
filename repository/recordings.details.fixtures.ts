import type { RecordingDetail } from '@/repository/recordings'
import { RECORDING_FIXTURES } from '@/repository/recordings.fixtures'

function base(id: string) {
  const found = RECORDING_FIXTURES.find((r) => r.id === id)
  if (!found) throw new Error(`fixture ${id} not found`)
  return found
}

export const RECORDING_DETAIL_FIXTURES: RecordingDetail[] = [
  {
    ...base('1291'),
    channelNo: '121',
    genres: ['バラエティ'],
    avInfo: '1080i · ステレオ · 字幕あり',
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
    thumbnailState: { main: '未生成', sub: 'まだ作られていません' },
  },
  {
    ...base('1274'),
    channelNo: '131',
    genres: ['バラエティ'],
    avInfo: '1080i · ステレオ · 字幕あり',
    synopsis:
      '保存瓶の煮沸から常備菜の段取りまで、台所の一週間を整える30分。今週は夏野菜の作り置き特集。',
    outcomeBody:
      '期待ウィンドウ 30分に対し、書けた尺 30:04・実ファイル 3.4 GB。突き合わせの内訳は「録画の記録」にあります。',
    outcomeAxis: '結果は品質(ドロップ)とは別の軸',
    reconcile: {
      range: '3.2–3.7 GB',
      sub: '書けた尺 30:04 / 実効ウィンドウ 30:04 · 被覆率 100.0%(判定の許容差は暫定値)',
    },
    interruptions: {
      main: '中断 0 回 / 再開 0 回',
      sub: '追記再開のため、繋ぎ目の有無はここで確認します',
    },
    tunerUnit: {
      main: 'adapter1/frontend0',
      sub: 'PT3 · 地上 · セッション rec-20260809-2300-041',
    },
    eoverflow: '0 件',
    scramble: {
      main: '0 パケット',
      sub: 'サイズが正しいのに再生できない場合はここを見ます',
    },
    stopReason: '自分の abort(終了時刻に到達)',
    thumbnailState: { main: '生成済み', sub: '抽出位置 120 秒' },
    qualityTotal: '0',
    qualityRatio: '0.0000',
    seek: { playedPct: 23, time: '0:06:55 / 0:30:04' },
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
    outcomeBody:
      '期待ウィンドウ 30分に対し、書けた尺 30:00・実ファイル 3.3 GB。突き合わせの内訳は「録画の記録」にあります。',
    outcomeAxis: '結果は品質(ドロップ)とは別の軸',
    reconcile: {
      range: '3.2–3.7 GB',
      sub: '書けた尺 30:00 / 実効ウィンドウ 30:00 · 被覆率 100.0%(判定の許容差は暫定値)',
    },
    interruptions: { main: '中断 0 回 / 再開 0 回' },
    tunerUnit: {
      main: 'adapter3/frontend0',
      sub: 'PT3 · 地上 · セッション rec-20260809-0105-091',
    },
    eoverflow: '0 件',
    scramble: { main: '0 パケット' },
    stopReason: '自分の abort(終了時刻に到達)',
    thumbnailState: { main: '生成済み', sub: '抽出位置 120 秒' },
    qualityTotal: '0',
    qualityRatio: '0.0000',
    seek: { playedPct: 0, time: '0:00:00 / 0:30:00' },
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
    outcomeBody:
      '期待ウィンドウ 4時間13分に対し、書けた尺 4:12:38・実ファイル 29.6 GB。リレー放送 3 セグメントの1本目です。',
    outcomeAxis: '結果は品質(ドロップ)とは別の軸',
    reconcile: {
      range: '28.4–32.6 GB',
      sub: '書けた尺 4:12:38 / 実効ウィンドウ 4:13:00 · 被覆率 99.8%(判定の許容差は暫定値)',
    },
    interruptions: { main: '中断 0 回 / 再開 0 回' },
    tunerUnit: {
      main: 'adapter0/frontend0',
      sub: 'PT3 · 地上 · セッション rec-20260808-1230-011',
    },
    eoverflow: '0 件',
    scramble: { main: '0 パケット' },
    stopReason: '自分の abort(終了時刻に到達)',
    thumbnailState: { main: '生成済み', sub: '抽出位置 120 秒' },
    qualityTotal: '38,412',
    qualityRatio: '0.023',
    qualitySpots: [
      { at: '13:12 付近', packets: '36,980 パケット' },
      { at: '15:44 付近', packets: '1,432 パケット' },
    ],
    seek: {
      playedPct: 23,
      time: '0:58:12 / 4:12:38',
      cmSpans: [
        { leftPct: 12.4, widthPct: 5.2 },
        { leftPct: 34.8, widthPct: 4.6 },
        { leftPct: 58.1, widthPct: 5.4 },
        { leftPct: 80.3, widthPct: 4.9 },
      ],
      chapterPcts: [12.4, 17.6, 34.8, 39.4, 58.1, 63.5, 80.3, 85.2],
      dropPcts: [17, 74],
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
    channelNo: '131',
    genres: ['バラエティ'],
    avInfo: '1080i · ステレオ · 字幕あり',
    outcomeBody:
      '被覆率 67.0% · 実ファイル 4.2 GB(期待レンジ 5.9–6.8 GB)· 書けた尺 36:12 / 実効ウィンドウ 54:00 · 中断 3 回 / 再開 2 回',
    outcomeAxis: '末尾 18 分が欠けています',
    reconcile: {
      range: '5.9–6.8 GB',
      sub: '書けた尺 36:12 / 実効ウィンドウ 54:00 · 被覆率 67.0%(判定の許容差は暫定値)',
    },
    interruptions: {
      main: '中断 3 回 / 再開 2 回',
      sub: '追記再開のため、繋ぎ目の有無はここで確認します',
    },
    tunerUnit: {
      main: 'adapter1/frontend0',
      sub: 'PT3 · 地上 · セッション rec-20260804-2300-041',
    },
    eoverflow: '0 件',
    scramble: { main: '0 パケット' },
    stopReason: '競合により落とされた',
    thumbnailState: { main: '生成済み', sub: '抽出位置 120 秒' },
    qualityTotal: '0',
    qualityRatio: '0.0000',
    seek: { playedPct: 0, time: '0:00:00 / 0:36:12' },
    encodePanel: {
      profile: '録画再生用(H.264)',
      queueSub:
        '待機列の 2 番目です。エンコードはライブ視聴に譲ります。視聴中は使用コアを抑えます。',
      registeredAt: '08/04(月) 23:40',
    },
  },
  {
    ...base('1239'),
    channelNo: '161',
    genres: ['バラエティ'],
    avInfo: '—',
    outcomeBody:
      '実ファイル 0 B · 開始 00:15:04 / 終了 00:15:21 · 理由は「失敗の理由」に分類して残ります',
    outcomeAxis: 'サムネイルは作りません',
    interruptions: { main: '中断 0 回 / 再開 0 回' },
    tunerUnit: {
      main: 'adapter2/frontend0',
      sub: 'PT3 · 地上 · セッション rec-20260802-0015-071',
    },
    eoverflow: '0 件',
    scramble: {
      main: '18,203 パケット',
      sub: 'サイズが正しいのに再生できない場合はここを見ます',
    },
    stopReason: '自分の abort(スクランブル解除失敗)',
    failureReason: {
      title: 'スクランブル解除失敗',
      body: '閾値を超えた残存パケットを検出しました。サイズが正しいのに全編再生できない場合の唯一の手がかりです。',
    },
    thumbnailState: { main: 'failed のため作らなかった' },
  },
  {
    ...base('0412'),
    channelNo: '171',
    genres: ['ドキュメンタリー'],
    avInfo: '1080i · ステレオ · 字幕あり',
    outcomeBody:
      '期待ウィンドウ 30分に対し、書けた尺 30:00・実ファイル 3.5 GB。移行で取り込んだ録画のため、品質は未計測です。',
    outcomeAxis: '結果は品質(ドロップ)とは別の軸',
    reconcile: {
      range: '3.2–3.7 GB',
      sub: '書けた尺 30:00 / 実効ウィンドウ 30:00 · 被覆率 100.0%(判定の許容差は暫定値)',
    },
    interruptions: { main: '中断 0 回 / 再開 0 回' },
    eoverflow: '—',
    stopReason: '移行で取り込み(記録なし)',
    thumbnailState: { main: '生成済み', sub: '抽出位置 120 秒' },
    seek: { playedPct: 0, time: '0:00:00 / 0:30:00' },
    encodePanel: {
      profile: '録画再生用(H.264)',
      queueSub:
        '待機列の 5 番目です。エンコードはライブ視聴に譲ります。視聴中は使用コアを抑えます。',
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
    outcomeBody:
      '期待ウィンドウ 2時間6分に対し、書けた尺 2:06:14・実ファイル 13.8 GB。突き合わせの内訳は「録画の記録」にあります。',
    outcomeAxis: '結果は品質(ドロップ)とは別の軸',
    reconcile: {
      range: '13.1–15.1 GB',
      sub: '書けた尺 2:06:14 / 実効ウィンドウ 2:06:14 · 被覆率 100.0%(判定の許容差は暫定値)',
    },
    interruptions: { main: '中断 0 回 / 再開 0 回' },
    tunerUnit: {
      main: 'adapter1/frontend0',
      sub: 'PT3 · 地上 · セッション rec-20260725-2100-041',
    },
    eoverflow: '2 件',
    scramble: { main: '0 パケット' },
    stopReason: '自分の abort(終了時刻に到達)',
    thumbnailState: {
      main: '生成失敗',
      sub: 'サムネイルが無いことは録画の失敗ではありません',
      canGenerate: true,
    },
    qualityTotal: '178,530',
    qualityRatio: '0.243',
    qualitySpots: [
      { at: '21:41 付近', packets: '171,204 パケット' },
      { at: '21:58 付近', packets: '7,326 パケット' },
    ],
    seek: { playedPct: 0, time: '0:00:00 / 2:06:14', dropPcts: [33, 46] },
    encodePanel: { profile: '録画再生用(H.264)', attempts: '2 回 / 上限 3 回' },
  },
  {
    ...base('0731'),
    channelNo: '131',
    genres: ['ドキュメンタリー'],
    avInfo: '1080i · ステレオ · 字幕あり',
    outcomeBody:
      '期待ウィンドウ 30分に対し、書けた尺 30:04。実ファイルがありません。',
    outcomeAxis: '結果は品質(ドロップ)とは別の軸',
    interruptions: { main: '中断 0 回 / 再開 0 回' },
    eoverflow: '—',
    stopReason: '移行で取り込み(記録なし)',
    thumbnailState: { main: '未生成', sub: 'まだ作られていません' },
  },
]
