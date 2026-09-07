'use client'

import { useState, useTransition } from 'react'

import { cn } from '@/lib/utils'
import { noteThumbnailRedrawn } from '@/hooks/useRedrawnThumbnail'
import type {
  Recording,
  ThumbnailRemake,
  ThumbnailWrite,
} from '@/repository/recordings'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/vela/progress'

const DREW: Record<ThumbnailRemake, { drew: boolean; text: string }> = {
  drawn: { drew: true, text: 'サムネイルを作り直しました。' },
  skipped: { drew: false, text: 'この録画にサムネイルは作成されません。' },
  failed: { drew: false, text: 'サムネイルを作り直せませんでした。' },
  nothingToAskAbout: { drew: false, text: 'この録画は残っていません。' },
  nowhereToPutThem: {
    drew: false,
    text: 'サムネイルの保存先に到達できません。',
  },
  outOfReach: { drew: false, text: '録画ファイルに到達できません。' },
}

function refusing(recording: Recording): string | undefined {
  if (recording.outcome === 'recording') {
    return '録画中は作り直せません'
  }

  if (recording.fileMissing) {
    return 'ファイルが見つからないため作り直せません'
  }

  if (recording.sizeBytes === 0) {
    return '中身が書かれていないため作り直せません'
  }

  return undefined
}

export function redrawsThumbnail(recording: Recording): boolean {
  return recording.outcome !== 'failed'
}

export function ThumbnailButton({
  recording,
  onRemake,
}: {
  recording: Recording
  onRemake: (id: string) => Promise<ThumbnailWrite>
}) {
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState<{ drew: boolean; text: string }>()
  const refused = refusing(recording)

  const redraw = () => {
    if (pending) {
      return
    }

    startTransition(async () => {
      setNotice(undefined)

      const result = await onRemake(recording.id)
      const said =
        result.state === 'rejected'
          ? { drew: false, text: result.message }
          : DREW[result.remake]

      if (said.drew) {
        noteThumbnailRedrawn(recording.id)
      }

      setNotice(said)
    })
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        variant="outline"
        disabled={refused !== undefined}
        title={refused}
        aria-disabled={pending}
        onClick={redraw}
      >
        {pending && <Spinner className="size-3.5" />}
        サムネイルを作り直す
      </Button>
      {notice && (
        <p
          role="status"
          className={cn('text-note', notice.drew ? 'text-mint' : 'text-coral')}
        >
          {notice.text}
        </p>
      )}
    </div>
  )
}
