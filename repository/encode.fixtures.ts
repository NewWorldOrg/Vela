import type { EncodeProfile, EncodeResult } from '@/repository/encode'

const PLAYBACK_PROFILE: EncodeProfile = {
  id: 'pf-1',
  name: '録画再生用',
  codec: 'H.264',
  resolution: 'ソースのまま',
  crf: '22',
  deinterlace: '自動(yadif)',
  output: '.mp4',
}

export const ENCODE: EncodeResult = {
  running: {
    id: 'job-1',
    title: 'コメット急行 #103',
    recordedAt: '08/09(土) 23:00 の録画',
    progressPct: 42,
    elapsed: '経過 07:41',
    remaining: '残り およそ 10 分',
    cores: '使用コア 2 / 6',
  },
  waiting: 2,
  failed: 2,
  averageMinutes: '18',
  averageNote: '分(直近 10 本の平均 / 放送 1 分あたり 29.2 秒)',
  concurrency: '1',
  concurrencyNote: '本(固定)',
  failures: [
    {
      id: 'fail-1',
      title: '金曜シネマ「星の渡り鳥」',
      body: 'ffmpeg が 0 以外の終了コードで終わりました。',
      classification: 'ffmpeg_exit_nonzero',
      tone: 'err',
    },
    {
      id: 'fail-2',
      title: '都市対抗クイズ選手権 準決勝',
      body: '出力先の空き容量が足りませんでした。',
      classification: 'disk_insufficient',
      tone: 'warn',
    },
  ],
  profiles: [PLAYBACK_PROFILE],
  editing: PLAYBACK_PROFILE,
  lastSavedAt: '最終保存 08/09 14:30',
  autoEncode: {
    enabled: true,
    target: 'すべての録画',
    coreLimit: '2 コア(既定)',
    concurrency: '1',
  },
}
