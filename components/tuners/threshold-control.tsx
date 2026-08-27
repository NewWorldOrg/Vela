'use client'

import { useState } from 'react'

import type { TunerWriteResult } from '@/repository/tuners'
import { Button } from '@/components/ui/button'
import { ThresholdDialog } from '@/components/tuners/threshold-dialog'

export function ThresholdControl({
  hours,
  onSave,
}: {
  hours: number
  onSave: (hours: number) => Promise<TunerWriteResult>
}) {
  const [editing, setEditing] = useState(false)

  return (
    <>
      <Button variant="ghost" size="xs" onClick={() => setEditing(true)}>
        変更
      </Button>
      {/* Mounted only while it is open, so each opening reads the threshold as
          it stands. */}
      {editing && (
        <ThresholdDialog
          hours={hours}
          open
          onOpenChange={setEditing}
          onSave={onSave}
        />
      )}
    </>
  )
}
