import type { CollectionStatus, StreamVisitRow } from '@/repository/collection'

function statusOf(streams: StreamVisitRow[]): CollectionStatus {
  return {
    streams,
    kindCounts: [
      { kind: 'terrestrial', label: '地上波', count: streams.length },
    ],
    troubledCount: streams.filter((row) => row.outcome === 'incomplete').length,
    zeroServiceKinds: [
      { kind: 'bs', label: 'BS' },
      { kind: 'cs110', label: 'CS110' },
    ],
    streamTargets: streams.map((row) => ({
      value: row.key,
      label: `TS ${row.transportStreamId}(${row.channelLabel})${row.name}`,
      networkId: row.networkId,
      transportStreamId: row.transportStreamId,
    })),
    serviceTargets: [
      {
        value: '32703-101',
        label: '中央テレビ1',
        networkId: 32703,
        serviceId: 101,
      },
      {
        value: '32707-201',
        label: 'シティ MX1',
        networkId: 32707,
        serviceId: 201,
      },
      {
        value: '32701-301',
        label: 'みなと総合1',
        networkId: 32701,
        serviceId: 301,
      },
      {
        value: '32705-401',
        label: '東都テレビ1',
        networkId: 32705,
        serviceId: 401,
      },
      {
        value: '32706-501',
        label: '湾岸放送1',
        networkId: 32706,
        serviceId: 501,
      },
      {
        value: '32704-601',
        label: '第一テレビ1',
        networkId: 32704,
        serviceId: 601,
      },
      {
        value: '32702-701',
        label: 'みなと教育1',
        networkId: 32702,
        serviceId: 701,
      },
    ],
  }
}

function row(
  fixture: Partial<StreamVisitRow> &
    Pick<StreamVisitRow, 'name' | 'channelLabel' | 'outcome'> & {
      transportStreamId: number
    },
): StreamVisitRow {
  return {
    key: `${fixture.transportStreamId}-${fixture.transportStreamId}`,
    networkId: fixture.transportStreamId,
    kind: 'terrestrial',
    serviceCount: 3,
    consecutiveIncomplete: 0,
    stale: false,
    ...fixture,
  }
}

/** The ordinary evening: one stream held back, the rest freshly completed. */
export const COLLECTION_FIXTURES: CollectionStatus = statusOf([
  {
    ...row({
      transportStreamId: 32701,
      name: 'みなと総合',
      channelLabel: '53ch',
      outcome: 'complete',
    }),
    lastCompletedLabel: '20:52',
    lastAttemptedAt: '2026-08-08T11:52:00Z',
    lastAttemptedLabel: '20:52',
    durationLabel: '3分58秒',
  },
  {
    ...row({
      transportStreamId: 32702,
      name: 'みなと教育',
      channelLabel: '55ch',
      outcome: 'complete',
    }),
    serviceCount: 2,
    lastCompletedLabel: '20:22',
    lastAttemptedAt: '2026-08-08T11:22:00Z',
    lastAttemptedLabel: '20:22',
    durationLabel: '4分12秒',
  },
  {
    ...row({
      transportStreamId: 32703,
      name: '中央テレビ',
      channelLabel: '57ch',
      outcome: 'basicOnly',
    }),
    lastCompletedLabel: '20:41',
    lastAttemptedAt: '2026-08-08T11:41:00Z',
    lastAttemptedLabel: '20:41',
    durationLabel: '6分05秒',
  },
  {
    ...row({
      transportStreamId: 32704,
      name: '第一テレビ',
      channelLabel: '56ch',
      outcome: 'complete',
    }),
    lastCompletedLabel: '20:12',
    lastAttemptedAt: '2026-08-08T11:12:00Z',
    lastAttemptedLabel: '20:12',
    durationLabel: '3分44秒',
  },
  {
    ...row({
      transportStreamId: 32705,
      name: '東都テレビ',
      channelLabel: '58ch',
      outcome: 'complete',
    }),
    serviceCount: 4,
    lastCompletedLabel: '20:34',
    lastAttemptedAt: '2026-08-08T11:34:00Z',
    lastAttemptedLabel: '20:34',
    durationLabel: '4分20秒',
  },
  {
    ...row({
      transportStreamId: 32706,
      name: '湾岸放送',
      channelLabel: '62ch',
      outcome: 'incomplete',
    }),
    lastAttemptedAt: '2026-08-08T12:15:00Z',
    lastAttemptedLabel: '21:15',
    durationLabel: '10分00秒',
    consecutiveIncomplete: 3,
    notBeforeLabel: '23:25',
  },
  {
    ...row({
      transportStreamId: 32707,
      name: 'シティ MX',
      channelLabel: '59ch',
      outcome: 'complete',
    }),
    serviceCount: 2,
    lastCompletedLabel: '19:58',
    lastAttemptedAt: '2026-08-08T10:58:00Z',
    lastAttemptedLabel: '19:58',
    durationLabel: '4分31秒',
  },
])

/** Every stream freshly completed; the sweep is waiting for its next turn. */
export const COLLECTION_ALL_COMPLETE: CollectionStatus = statusOf(
  COLLECTION_FIXTURES.streams.map((stream) =>
    stream.outcome === 'complete'
      ? stream
      : {
          ...stream,
          outcome: 'complete',
          lastCompletedLabel: '20:58',
          durationLabel: '7分12秒',
          consecutiveIncomplete: 0,
          notBeforeLabel: undefined,
        },
  ),
)

/** Backed-off, untunable and interrupted streams side by side. */
export const COLLECTION_TROUBLED: CollectionStatus = statusOf([
  {
    ...row({
      transportStreamId: 32706,
      name: '湾岸放送',
      channelLabel: '62ch',
      outcome: 'incomplete',
    }),
    lastAttemptedAt: '2026-08-08T12:15:00Z',
    lastAttemptedLabel: '21:15',
    durationLabel: '10分00秒',
    consecutiveIncomplete: 3,
    notBeforeLabel: '23:25',
  },
  {
    ...row({
      transportStreamId: 32703,
      name: '中央テレビ',
      channelLabel: '57ch',
      outcome: 'incomplete',
    }),
    lastAttemptedAt: '2026-08-08T11:41:00Z',
    lastAttemptedLabel: '20:41',
    durationLabel: '10分01秒',
    consecutiveIncomplete: 5,
    notBeforeLabel: '8/9(土) 01:12',
  },
  {
    ...row({
      transportStreamId: 32707,
      name: 'シティ MX',
      channelLabel: '59ch',
      outcome: 'noLock',
    }),
    serviceCount: 2,
    lastAttemptedAt: '2026-08-08T11:05:00Z',
    lastAttemptedLabel: '20:05',
  },
  {
    ...row({
      transportStreamId: 32704,
      name: '第一テレビ',
      channelLabel: '56ch',
      outcome: 'interrupted',
    }),
    lastAttemptedAt: '2026-08-08T11:48:00Z',
    lastAttemptedLabel: '20:48',
  },
  {
    ...row({
      transportStreamId: 32701,
      name: 'みなと総合',
      channelLabel: '53ch',
      outcome: 'complete',
    }),
    lastCompletedLabel: '20:52',
    lastAttemptedAt: '2026-08-08T11:52:00Z',
    lastAttemptedLabel: '20:52',
    durationLabel: '3分58秒',
  },
  {
    ...row({
      transportStreamId: 32702,
      name: 'みなと教育',
      channelLabel: '55ch',
      outcome: 'neverVisited',
    }),
    serviceCount: 2,
  },
])
