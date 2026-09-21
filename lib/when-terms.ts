const WHEN = {
  recorded: '録画',
  broadcast: '放送',
  taken: '取得',
} as const

export type WhenKind = keyof typeof WHEN

export const WHEN_MARKS: Record<WhenKind, string> = WHEN

export const WHEN_LABELS: Record<WhenKind, string> = {
  recorded: `${WHEN.recorded}日時`,
  broadcast: `${WHEN.broadcast}日時`,
  taken: `${WHEN.taken}日時`,
}
