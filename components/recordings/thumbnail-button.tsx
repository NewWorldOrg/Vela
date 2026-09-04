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

/**
 * What a finished pass answered, said in one sentence.
 *
 * Only three of the six ever arrive here: the API turns the other three into a
 * refusal with a status of its own before the body is written, and those are
 * read from the status instead. `drawn` is also the only one of the three that
 * leaves a picture behind — the pass answers `skipped` for a recording it will
 * not illustrate and `failed` for one it could not, and a 200 saying either is
 * a press that changed nothing.
 */
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

/**
 * Why the picture cannot be drawn again right now.
 *
 * Each of these is a state the recording leaves: a recording being written ends,
 * a file out of reach is what the integrity check is for, and a recording with
 * nothing in it is one the ledger has yet to observe a size for. So the button
 * stands, switched off, with the reason on it — as against a recording that
 * failed, which the pass answers `skipped` for and always will. There the
 * button is not drawn at all, and the band over the picture and the record both
 * already say why.
 *
 * A recording with no video in it is not here. Nothing in the answer says so
 * before the press: the pass reads the file itself, and a recording it can take
 * no frame from comes back as a 200 saying `failed`.
 */
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

/** Whether this recording is one the picture can ever be drawn again for. */
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
