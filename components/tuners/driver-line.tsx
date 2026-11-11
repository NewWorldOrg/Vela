import type { DriverFacts, DriverLink, StatusLine } from '@/repository/tuners'
import { EMPTY_VALUE } from '@/lib/empty-value'
import { HardwareLine } from '@/components/tuners/hardware-line'

const DRIVER_LINK: Record<DriverLink, Pick<StatusLine, 'word' | 'tone'>> = {
  connected: { word: '接続中', tone: 'ok' },
  draining: { word: '終了処理中', tone: 'warn' },
  disconnected: { word: '未接続', tone: 'err' },
  unknown: { word: '接続状態不明', tone: 'warn' },
}

/** The driver itself: which version runs, since when, and whether it answers. */
export function DriverLine({
  facts,
  connection,
}: {
  facts: DriverFacts
  connection: DriverLink
}) {
  return (
    <HardwareLine
      title={`Puppis ${facts.version ?? EMPTY_VALUE}`}
      sub={facts.startedAt && `${facts.startedAt} から動作`}
      status={{
        ...DRIVER_LINK[connection],
        line: facts.respondedAt && `${facts.respondedAt} に応答`,
      }}
    />
  )
}
