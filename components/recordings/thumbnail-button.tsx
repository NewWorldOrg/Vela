'use client'

import { useState, useTransition } from 'react'

import { cn } from '@/lib/utils'
import {
  NOT_YET_IN_THIS_BUILD_SAYING,
  shapeFor,
} from '@/lib/not-yet-in-this-build'
import { noteThumbnailRedrawn } from '@/hooks/useRedrawnThumbnail'
import type {
  Recording,
  ThumbnailRemake,
  ThumbnailWrite,
} from '@/repository/recordings'
import { Button } from '@/components/ui/button'
import { RebuildIcon } from '@/components/vela/icons'
import { Spinner } from '@/components/vela/progress'

const DREW: Record<ThumbnailRemake, { drew: boolean; text: string }> = {
  drawn: { drew: true, text: 'サムネイルを再生成しました。' },
  skipped: { drew: false, text: 'この録画にサムネイルは作成されません。' },
  failed: { drew: false, text: 'サムネイルを再生成できませんでした。' },
  nothingToAskAbout: {
    drew: false,
    text: 'この録画は残っていないため、サムネイルを再生成できませんでした。',
  },
  nowhereToPutThem: {
    drew: false,
    text: 'サムネイルの保存先に到達できないため、サムネイルを再生成できませんでした。',
  },
  outOfReach: {
    drew: false,
    text: '録画ファイルに到達できないため、サムネイルを再生成できませんでした。',
  },
}

const NOT_YET_DREW = { drew: false, text: NOT_YET_IN_THIS_BUILD_SAYING }

export function remadeSaying(result: ThumbnailWrite): {
  drew: boolean
  text: string
} {
  return result.state === 'rejected'
    ? { drew: false, text: result.message }
    : shapeFor(DREW, result.remake, NOT_YET_DREW)
}

function refusing(recording: Recording): string | undefined {
  if (recording.outcome === 'recording') {
    return '録画中のため、再生成できません。'
  }

  if (recording.fileMissing) {
    return 'ファイルが見つからないため、再生成できません。'
  }

  if (recording.sizeBytes === 0) {
    return '中身が書かれていないため、再生成できません。'
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

      const said = remadeSaying(await onRemake(recording.id))

      if (said.drew) {
        noteThumbnailRedrawn(recording.id)
      }

      setNotice(said)
    })
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        variant="change"
        disabled={refused !== undefined}
        title={refused}
        aria-disabled={pending}
        onClick={redraw}
      >
        {pending ? <Spinner size="control" /> : <RebuildIcon />}
        サムネイルを再生成
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
