import { signedOut } from '@/lib/signed-out'
import { couldNot } from '@/lib/try-again'
import type {
  SegmentKind,
  SegmentsRefusal,
} from '@/repository/recording-segments'

export const SEGMENTS_HEADING = 'CM・OP・ED'

export const CONFIRMED = '確認済み'

export const SEGMENT_KIND_LABEL: Record<SegmentKind, string> = {
  programme: '本編',
  break: 'CM',
}

export const SEGMENT_KINDS = Object.keys(SEGMENT_KIND_LABEL) as SegmentKind[]

export const SEGMENT_ACTION = {
  change: '変更',
  confirm: '確認済みにする',
  unconfirm: '確認を取り消し',
  withdraw: '自動の判定に戻す',
  split: '現在位置で分割',
  remove: '削除',
  cancel: 'キャンセル',
} as const

export const SEGMENT_COLUMN = {
  kind: '種類',
  starts: '開始',
  ends: '終了',
  length: '長さ',
} as const

/** The name a boundary's grip is read out by; its value is the position it stands at. */
export const BOUNDARY = '境目'

export const WITHDRAWING = {
  title: 'この録画の手直しを取り消します',
  body: '自動で判定した位置に戻ります。元に戻せません。',
  confirm: '取り消す',
} as const

const NOT_SAVED = '保存できませんでした。'

export const SEGMENTS_SAVED = '保存しました。'

export const SEGMENTS_NOT_SAVED: Record<SegmentsRefusal, string> = {
  gap: `区間のあいだに隙間があるため、${NOT_SAVED}`,
  overlap: `区間が重なっているため、${NOT_SAVED}`,
  outside: `録画の外にはみ出した区間があるため、${NOT_SAVED}`,
  unknownKind: `受け付けられない種類の区間があるため、${NOT_SAVED}`,
  tooMany: `区間が多すぎるため、${NOT_SAVED}`,
  endsBeforeStarts: `開始より前に終わる区間があるため、${NOT_SAVED}`,
  stillRecording: `録画中のため、${NOT_SAVED}`,
  gone: `録画が見つからないため、${NOT_SAVED}`,
  unanswered: couldNot(NOT_SAVED),
}

export const SEGMENTS_SIGNED_OUT = signedOut('保存')

export const WITHDRAW_SIGNED_OUT = signedOut('取り消し')

export const WITHDRAW_FAILED = couldNot('取り消せませんでした')
