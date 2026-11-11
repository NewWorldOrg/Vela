'use client'

import type { StreamVisitRow } from '@/repository/collection'
import { Figure } from '@/components/guide/figure'

export function VisitDetail({ row }: { row: StreamVisitRow }) {
  if (row.outcome === 'noLock' || row.outcome === 'noBytes') {
    return (
      <>
        <span>
          {row.outcome === 'noLock' ? '信号を掴めない' : 'データが来ない'}
        </span>
      </>
    )
  }

  if (row.outcome === 'interrupted') {
    return (
      <>
        <span>収集中に中断されました</span>
      </>
    )
  }

  if (row.outcome === 'neverVisited') {
    return <span className="text-ink-2">まだ訪問していません</span>
  }

  if (row.outcome === 'incomplete') {
    return (
      <>
        <span className="font-bold text-lemon">収集不調</span>
        <span>
          連続 <Figure>{row.consecutiveIncomplete}</Figure> 回
        </span>
        {row.durationLabel && (
          <span>
            前回 <Figure>{row.durationLabel}</Figure>で打ち切り
          </span>
        )}
        {row.notBeforeLabel && (
          <span>
            次の訪問 <Figure>{row.notBeforeLabel}</Figure> 以降
          </span>
        )}
      </>
    )
  }

  return (
    <>
      {row.lastCompletedLabel && (
        <span>
          最終完了 <Figure>{row.lastCompletedLabel}</Figure>
        </span>
      )}
      {row.durationLabel && (
        <span>
          所要 <Figure>{row.durationLabel}</Figure>
        </span>
      )}
      {row.outcome === 'basicOnly' && (
        <span className="text-ink-2">詳細は次回に持ち越し</span>
      )}
    </>
  )
}
