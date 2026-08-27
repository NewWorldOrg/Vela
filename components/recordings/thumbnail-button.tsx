'use client'

import { useState, useTransition } from 'react'

import type { ThumbnailRemake, ThumbnailWrite } from '@/repository/recordings'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/vela/banner'

/**
 * The three answers a finished pass gives, said in the screen's own terms.
 * `drawn` is the only one that leaves a picture behind; the other two are
 * outcomes rather than errors, so they read as a state and not as a refusal.
 */
const DREW: Record<ThumbnailRemake, { tone: 'ok' | 'warn'; text: string }> = {
  drawn: { tone: 'ok', text: 'サムネイルを生成しました。' },
  skipped: {
    tone: 'warn',
    text: 'この録画にサムネイルは生成されません。サムネイルが無いことは録画の失敗ではありません。',
  },
  failed: {
    tone: 'warn',
    text: 'サムネイルを生成できませんでした。録画の結果は変わりません。',
  },
  nothingToAskAbout: {
    tone: 'warn',
    text: 'この録画にサムネイルは生成されません。',
  },
  nowhereToPutThem: {
    tone: 'warn',
    text: 'サムネイルの保存先が決まっていないため、生成できませんでした。',
  },
  outOfReach: {
    tone: 'warn',
    text: '録画ファイルに到達できないため、生成できませんでした。',
  },
}

export function ThumbnailButton({
  id,
  label,
  onRemake,
}: {
  id: string
  label: string
  onRemake: (id: string) => Promise<ThumbnailWrite>
}) {
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn'; text: string }>()

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setNotice(undefined)

            const result = await onRemake(id)

            setNotice(
              result.state === 'rejected'
                ? { tone: 'warn', text: result.message }
                : DREW[result.remake],
            )
          })
        }
      >
        {label}
      </Button>
      {notice && (
        <span aria-live="polite" className="basis-full">
          {notice.tone === 'warn' ? (
            <InlineAlert tone="warn">{notice.text}</InlineAlert>
          ) : (
            <span className="block text-note leading-relaxed text-mint">
              {notice.text}
            </span>
          )}
        </span>
      )}
    </>
  )
}
