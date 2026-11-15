import type {
  NotificationDelivery,
  NotificationDestination,
  NotificationRuleSet,
  NotificationsScreen,
  WatchedProgramme,
} from '@/lib/notifications'

export const NOTIFICATIONS_NOW = Date.parse('2026-11-09T12:30:00Z')

export const HOME_SLACK: NotificationDestination = {
  id: 'dest-slack',
  name: '家の Slack',
  kind: 'slack',
  tail: 'a1b2',
  enabled: true,
  readable: true,
  lastResultAt: '2026-11-09T12:03:00Z',
}

export const DISCORD_ROOM: NotificationDestination = {
  id: 'dest-discord',
  name: 'Discord の通知部屋',
  kind: 'discord',
  tail: '9f3e',
  enabled: true,
  readable: true,
  lastResultAt: '2026-11-09T11:58:00Z',
  lastFailure: 'timedOut',
}

export const IPAD_FINGERPRINT =
  '3f1a9c0e7b2d4e6f8a1b3c5d7e9f0a2b4c6d8e0f1a3b5c7d9e1f2a4b6c8d0e2f'

export const IPAD_SAFARI: NotificationDestination = {
  id: 'dest-ipad',
  name: 'iPad の Safari',
  kind: 'webPush',
  fingerprint: IPAD_FINGERPRINT,
  enabled: true,
  readable: true,
  lastResultAt: '2026-11-09T12:03:00Z',
}

export const DESTINATIONS: NotificationDestination[] = [
  HOME_SLACK,
  DISCORD_ROOM,
  IPAD_SAFARI,
]

export const ONLY_WHEN_TROUBLED: NotificationRuleSet = {
  id: 'rule-trouble',
  name: '困ったときだけ',
  enabled: true,
  events: [
    'recordingTruncated',
    'recordingFailed',
    'encodeFailed',
    'reservationCompeting',
    'reservationMissed',
    'qualityIncidentDetected',
    'deviceDisconnected',
  ],
  destinations: [HOME_SLACK.id, IPAD_SAFARI.id],
}

export const RULE_SETS: NotificationRuleSet[] = [
  ONLY_WHEN_TROUBLED,
  {
    id: 'rule-record',
    name: '録画の記録',
    enabled: true,
    events: ['recordingStarted', 'recordingCompleted', 'encodeCompleted'],
    destinations: [DISCORD_ROOM.id],
  },
  {
    id: 'rule-away',
    name: '留守の週',
    enabled: false,
    events: [
      'recordingStarted',
      'recordingCompleted',
      'recordingTruncated',
      'recordingFailed',
      'encodeStarted',
      'encodeCompleted',
      'encodeFailed',
      'qualityIncidentDetected',
      'qualityIncidentResolved',
    ],
    destinations: [HOME_SLACK.id, DISCORD_ROOM.id],
  },
]

function delivery(
  id: string,
  occurredAt: string,
  kind: NotificationDelivery['kind'],
  to: NotificationDestination,
  state: NotificationDelivery['state'] = 'sent',
  failure?: NotificationDelivery['failure'],
): NotificationDelivery {
  return { id, kind, occurredAt, destinationId: to.id, state, failure }
}

export const DELIVERIES: NotificationDelivery[] = [
  delivery('del-1', '2026-11-09T12:03:00Z', 'recordingTruncated', HOME_SLACK),
  delivery('del-2', '2026-11-09T12:03:00Z', 'recordingTruncated', IPAD_SAFARI),
  delivery(
    'del-3',
    '2026-11-09T11:58:00Z',
    'encodeCompleted',
    DISCORD_ROOM,
    'failed',
    'timedOut',
  ),
  delivery('del-4', '2026-11-09T11:54:00Z', 'recordingCompleted', DISCORD_ROOM),
  delivery('del-5', '2026-11-09T11:15:00Z', 'recordingStarted', DISCORD_ROOM),
  delivery('del-6', '2026-11-09T10:27:00Z', 'programmeMoved', HOME_SLACK),
  delivery(
    'del-7',
    '2026-11-09T09:40:00Z',
    'reservationCompeting',
    HOME_SLACK,
    'givenUp',
    'rejected',
  ),
  delivery(
    'del-8',
    '2026-11-09T09:12:00Z',
    'qualityIncidentDetected',
    IPAD_SAFARI,
  ),
]

export const NOTIFICATIONS_SCREEN: NotificationsScreen = {
  settings: { notifyLeadMinutes: 3, publicOriginKnown: false },
  destinations: DESTINATIONS,
  ruleSets: RULE_SETS,
  deliveries: DELIVERIES,
}

export const EMPTY_NOTIFICATIONS_SCREEN: NotificationsScreen = {
  settings: { notifyLeadMinutes: 3, publicOriginKnown: true },
  destinations: [],
  ruleSets: [],
  deliveries: [],
}

export const TWENTY_RULE_SETS: NotificationRuleSet[] = Array.from(
  { length: 20 },
  (_, nth) => ({
    ...ONLY_WHEN_TROUBLED,
    id: `rule-${nth + 1}`,
    name: `ルールセット ${nth + 1}`,
  }),
)

export const WATCHED_DOCUMENTARY: WatchedProgramme = {
  id: 'watch-doc',
  title: 'ドキュメント 灯りの仕事「夜の港、最後の便まで」',
  channelName: 'みなと総合1',
  startAt: '2026-11-09T10:30:00Z',
  endAt: '2026-11-09T11:15:00Z',
  leadMinutes: 3,
  destinationNames: [HOME_SLACK.name, IPAD_SAFARI.name],
}

export const WATCHED_FOOTBALL: WatchedProgramme = {
  id: 'watch-football',
  title: 'サッカー中継 湾岸カップ 準決勝',
  channelName: '第一テレビ',
  startAt: '2026-11-09T13:00:00Z',
  endAt: '2026-11-09T14:30:00Z',
  leadMinutes: 5,
  destinationNames: [HOME_SLACK.name],
}
