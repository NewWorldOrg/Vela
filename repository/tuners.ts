export interface TunerRow {
  id: string
  device: string
  hardware: string
  kind: '地上波' | '衛星'
  enabled: boolean
  session?: { label: string; service: string }
  state: 'ok' | 'faulted' | 'idle'
  stateLabel: string
  lastService: string
  lnb?: boolean
}

export interface TunerResult {
  instanceId: string
  notices: { tone: 'danger' | 'warn'; body: string; action: string }[]
  thresholdHours: number
  rows: TunerRow[]
}

export const TUNERS: TunerResult = {
  instanceId: 'b7f2c9',
  notices: [
    {
      tone: 'danger',
      body: '1台のチューナーが利用できません。adapter2 — 設定の種別(地上波)と検出結果(衛星)が一致しません。',
      action: '該当行へ',
    },
    {
      tone: 'warn',
      body: '保存済み・未反映の変更があります。反映には driver の再起動が必要です。',
      action: '変更内容を確認',
    },
  ],
  thresholdHours: 24,
  rows: [
    {
      id: 'adapter0',
      device: 'adapter0',
      hardware: 'PT3 / frontend0',
      kind: '地上波',
      enabled: true,
      session: { label: '録画', service: 'みなと総合1 27ch' },
      state: 'ok',
      stateLabel: '正常',
      lastService: '21:04',
    },
    {
      id: 'adapter1',
      device: 'adapter1',
      hardware: 'PT3 / frontend0',
      kind: '地上波',
      enabled: true,
      state: 'idle',
      stateLabel: 'アイドル',
      lastService: '20:58',
    },
    {
      id: 'adapter2',
      device: 'adapter2',
      hardware: 'PT3 / frontend1',
      kind: '地上波',
      enabled: false,
      state: 'faulted',
      stateLabel: '種別不一致',
      lastService: '—',
      lnb: false,
    },
    {
      id: 'adapter3',
      device: 'adapter3',
      hardware: 'PT3 / frontend1',
      kind: '衛星',
      enabled: true,
      state: 'idle',
      stateLabel: 'アイドル',
      lastService: '3 日前',
      lnb: true,
    },
  ],
}

export async function getTuners(): Promise<TunerResult> {
  return TUNERS
}

export interface ServiceRow {
  id: string
  name: string
  sid: string
  kind: 'TV' | 'ワンセグ' | 'データ'
  currentCh: string
  candidates: number
  needsCheck: number
  enabled: boolean
  lastSeen: string
}

export interface ChannelsResult {
  warning?: { body: string; action: string }
  lastScan: string
  groups: {
    kind: string
    stat: string
    services: ServiceRow[]
  }[]
}

export const CHANNEL_SCAN: ChannelsResult = {
  warning: {
    body: 'BS のサービスが 0 件です(連続 26 時間)。有効な候補チャンネルを持つサービスがひとつも確認できていません。',
    action: '切り分けを見る',
  },
  lastScan: '前回: 地上波 50ch / 6分32秒 · 08/05 03:00',
  groups: [
    {
      kind: '地上波',
      stat: '8 サービス / 6 TS(TV 6 · ワンセグ 1 · データ 1)',
      services: [
        {
          id: 's-151',
          name: 'みなと総合1',
          sid: 'sid 1024',
          kind: 'TV',
          currentCh: '27ch',
          candidates: 2,
          needsCheck: 1,
          enabled: true,
          lastSeen: '21:04',
        },
        {
          id: 's-152',
          name: 'みなと総合2',
          sid: 'sid 1025',
          kind: 'ワンセグ',
          currentCh: '27ch',
          candidates: 1,
          needsCheck: 0,
          enabled: true,
          lastSeen: '21:04',
        },
        {
          id: 's-191',
          name: 'みなと教育1',
          sid: 'sid 1032',
          kind: 'TV',
          currentCh: '26ch',
          candidates: 1,
          needsCheck: 0,
          enabled: true,
          lastSeen: '21:00',
        },
        {
          id: 's-131',
          name: '中央テレビ1',
          sid: 'sid 1040',
          kind: 'TV',
          currentCh: '25ch',
          candidates: 1,
          needsCheck: 0,
          enabled: true,
          lastSeen: '21:02',
        },
        {
          id: 's-181',
          name: '第一テレビ1',
          sid: 'sid 1048',
          kind: 'TV',
          currentCh: '24ch',
          candidates: 2,
          needsCheck: 0,
          enabled: true,
          lastSeen: '20:59',
        },
        {
          id: 's-171',
          name: '湾岸放送1',
          sid: 'sid 1056',
          kind: 'TV',
          currentCh: '22ch',
          candidates: 1,
          needsCheck: 0,
          enabled: true,
          lastSeen: '21:01',
        },
        {
          id: 's-161',
          name: '東都テレビ1',
          sid: 'sid 1064',
          kind: 'TV',
          currentCh: '23ch',
          candidates: 1,
          needsCheck: 0,
          enabled: true,
          lastSeen: '21:03',
        },
        {
          id: 's-141',
          name: 'シティ MX1',
          sid: 'sid 1072',
          kind: 'TV',
          currentCh: '21ch',
          candidates: 1,
          needsCheck: 0,
          enabled: false,
          lastSeen: '3 日前',
        },
      ],
    },
    { kind: 'BS', stat: '0 サービス', services: [] },
  ],
}

export async function getChannels(): Promise<ChannelsResult> {
  return CHANNEL_SCAN
}
