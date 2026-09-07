'use client'

import { useState } from 'react'

import type {
  QualityThreshold,
  QualityThresholdKey,
  QualityWrite,
} from '@/repository/quality'
import { Button } from '@/components/ui/button'
import { ThresholdDialog } from '@/components/quality/threshold-dialog'

export function ChangeThresholdButton({
  thresholds,
  onRevise,
}: {
  thresholds: QualityThreshold[]
  onRevise: (key: QualityThresholdKey, amount: number) => Promise<QualityWrite>
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        閾値を変更
      </Button>
      {open && (
        <ThresholdDialog
          thresholds={thresholds}
          open
          onOpenChange={setOpen}
          onSave={onRevise}
        />
      )}
    </>
  )
}
