'use client'

import { useId, useRef, useState, type Ref } from 'react'

import { cn } from '@/lib/utils'
import { foldColumnBeside } from '@/lib/live-fold'
import { useHeight } from '@/hooks/useHeight'
import { useFoldingChannels, useSettled } from '@/components/live/channel-fold'
import {
  COLUMN_BODY,
  PLAYER_SIDE_COLUMN,
} from '@/components/live/remote-column-palette'
import { ColumnHead } from '@/components/live/column-head'
import { RemoteSlot } from '@/components/live/remote-slot'

const REMOTE = 'リモコン'

export function RecordingRemoteColumn({
  slotRef,
}: {
  slotRef: Ref<HTMLDivElement>
}) {
  const [folded, setFolded] = useState(false)
  const { motion, fold, play } = useFoldingChannels(folded, setFolded)
  const [arrived, setArrived] = useState(false)
  const column = useRef<HTMLElement>(null)
  const [body, setBody] = useState<HTMLDivElement | null>(null)
  const height = useHeight(body)
  const [kept, setKept] = useState(0)
  const slotId = useId()

  if (!arrived) {
    setArrived(true)
    play(false)
  }

  if (motion.shown && height !== kept) {
    setKept(height)
  }

  useSettled(column, motion.phase, motion.onSettle)

  return (
    <aside
      ref={column}
      aria-label={REMOTE}
      style={{ minHeight: kept }}
      className={cn(PLAYER_SIDE_COLUMN, foldColumnBeside(folded, motion))}
    >
      <div ref={setBody} className={COLUMN_BODY}>
        <ColumnHead
          folded={folded}
          onFold={fold}
          controls={slotId}
          foldLabel={REMOTE}
        />
        {motion.shown && (
          <RemoteSlot id={slotId} motion={motion} slotRef={slotRef} />
        )}
      </div>
    </aside>
  )
}
