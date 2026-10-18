'use client'

import { useId, useRef, useState, type Ref } from 'react'

import { cn } from '@/lib/utils'
import { foldColumnBeside } from '@/lib/live-fold'
import { useHeight } from '@/hooks/useHeight'
import { useFoldingChannels, useSettled } from '@/components/live/channel-fold'
import {
  COLUMN_BODY,
  ColumnHead,
  PLAYER_SIDE_COLUMN,
  RemoteSlot,
} from '@/components/live/remote-column'

/** The column's name, and its fold's: what it holds, as the recording's page has no channels to list. */
const REMOTE = 'リモコン'

/** The column the recording's page stands beside its player while the data broadcast is open in a wide window, where the live page has one of its own: the fold alone at its head, as there are no channels to switch to, and the remote under it. It always arrives with the remote, growing from nothing as the remote slides in. The fold makes it the thin rail and back, keeping the height it had with the remote so the programme's information under the player stays where it was, and is forgotten when the data broadcast closes and the column goes. */
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
