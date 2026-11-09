import type {
  NotificationDelivery,
  NotificationDestination,
  NotificationRuleSet,
} from '@/lib/notifications'
import type { NotificationsScreen } from '@/components/notifications/notifications-page'
import type { WatchedProgramme } from '@/components/notifications/notify-only-row'

export const NOTIFICATIONS_NOW = Date.parse('2026-11-09T12:30:00Z')

export const HOME_SLACK: NotificationDestination = {
  id: 'dest-slack',
  name: '家の Slack',
  kind: 'slack',
  urlTail: 'a1b2',
  enabled: true,
  lastResult: { state: 'sent', at: '2026-11-09T12:03:00Z' },
}

export const DISCORD_ROOM: NotificationDestination = {
  id: 'dest-discord',
  name: 'Discord の通知部屋',
  kind: 'discord',
  urlTail: '9f3e',
  enabled: true,
  lastResult: {
    state: 'failed',
    at: '2026-11-09T11:58:00Z',
    failure: 'timeout',
  },
}

export const IPAD_SAFARI: NotificationDestination = {
  id: 'dest-ipad',
  name: 'iPad の Safari',
  kind: 'webPush',
  enabled: true,
  lastResult: { state: 'sent', at: '2026-11-09T12:03:00Z' },
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
    'qualityRaised',
    'deviceDisconnected',
  ],
  destinationIds: [HOME_SLACK.id, IPAD_SAFARI.id],
}

export const RULE_SETS: NotificationRuleSet[] = [
  ONLY_WHEN_TROUBLED,
  {
    id: 'rule-record',
    name: '録画の記録',
    enabled: true,
    events: ['recordingStarted', 'recordingCompleted', 'encodeCompleted'],
    destinationIds: [DISCORD_ROOM.id],
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
      'qualityRaised',
      'qualityResolved',
    ],
    destinationIds: [HOME_SLACK.id, DISCORD_ROOM.id],
  },
]

const HARBOUR_RECIPES = '港町レシピ帖 #15「灯台守のパン」'

function delivery(
  id: string,
  at: string,
  event: NotificationDelivery['event'],
  subject: string,
  to: NotificationDestination,
  state: NotificationDelivery['state'] = 'sent',
  failure?: NotificationDelivery['failure'],
): NotificationDelivery {
  return {
    id,
    at,
    event,
    subject,
    destinationId: to.id,
    destinationName: to.name,
    state,
    failure,
  }
}

export const DELIVERIES: NotificationDelivery[] = [
  delivery(
    'del-1',
    '2026-11-09T12:03:00Z',
    'recordingTruncated',
    HARBOUR_RECIPES,
    HOME_SLACK,
  ),
  delivery(
    'del-2',
    '2026-11-09T12:03:00Z',
    'recordingTruncated',
    HARBOUR_RECIPES,
    IPAD_SAFARI,
  ),
  delivery(
    'del-3',
    '2026-11-09T11:58:00Z',
    'encodeCompleted',
    'ちびっこ忍者 第12話',
    DISCORD_ROOM,
    'failed',
    'timeout',
  ),
  delivery(
    'del-4',
    '2026-11-09T11:54:00Z',
    'recordingCompleted',
    'ドラマ「ひだまり荘の人々」#18',
    DISCORD_ROOM,
  ),
  delivery(
    'del-5',
    '2026-11-09T11:15:00Z',
    'recordingStarted',
    HARBOUR_RECIPES,
    DISCORD_ROOM,
  ),
  delivery(
    'del-6',
    '2026-11-09T10:27:00Z',
    'programmeStarting',
    'ドキュメント 灯りの仕事',
    HOME_SLACK,
  ),
  delivery(
    'del-7',
    '2026-11-09T09:40:00Z',
    'reservationCompeting',
    '深夜ドラマ「灯台守の娘」#3',
    HOME_SLACK,
    'givenUp',
    'rejected',
  ),
  delivery(
    'del-8',
    '2026-11-09T09:12:00Z',
    'qualityRaised',
    '中央テレビ · ドロップ率',
    IPAD_SAFARI,
  ),
]

export const NOTIFICATIONS_SCREEN: NotificationsScreen = {
  settings: { leadMinutes: 3, hasPublicOrigin: false },
  destinations: DESTINATIONS,
  ruleSets: RULE_SETS,
  deliveries: DELIVERIES,
}

export const EMPTY_NOTIFICATIONS_SCREEN: NotificationsScreen = {
  settings: { leadMinutes: 3, hasPublicOrigin: true },
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
  destinationIds: [HOME_SLACK.id, IPAD_SAFARI.id],
}

export const WATCHED_FOOTBALL: WatchedProgramme = {
  id: 'watch-football',
  title: 'サッカー中継 湾岸カップ 準決勝',
  channelName: '第一テレビ',
  startAt: '2026-11-09T13:00:00Z',
  endAt: '2026-11-09T14:30:00Z',
  leadMinutes: 5,
  destinationIds: [HOME_SLACK.id],
}
