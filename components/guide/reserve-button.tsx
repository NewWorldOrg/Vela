'use client'

import type { ReactNode } from 'react'
import { useState, useTransition } from 'react'

import type { ReservationWrite } from '@/repository/reservations'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/vela/banner'

const SIGNED_OUT =
  'サインインが切れているため、予約できませんでした。サインインしてから開き直してください。'

const CONTENDED =
  'チューナーに空きがないため、この予約は競合として登録されました。予約一覧で解決してください。'

const UNREACHABLE =
  'このサービスには選局先がないため、録画できません。設定のチャンネルで選局先を決めてください。'

const RESERVED = 'この番組を予約しました。予約一覧で確認できます。'

export function ReserveButton({
  programmeId,
  onReserve,
  children,
}: {
  programmeId: string
  onReserve: (programmeId: string) => Promise<ReservationWrite>
  children: ReactNode
}) {
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState<{
    tone: 'warn' | 'danger'
    text: string
  }>()
  const [reserved, setReserved] = useState(false)

  return (
    <>
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setNotice(undefined)
            setReserved(false)

            const result = await onReserve(programmeId)

            if (result.state === 'unauthenticated') {
              setNotice({ tone: 'danger', text: SIGNED_OUT })

              return
            }

            if (result.state === 'rejected') {
              setNotice({ tone: 'danger', text: result.message })

              return
            }

            if (result.verdict === 'unreachable') {
              setNotice({ tone: 'danger', text: UNREACHABLE })

              return
            }

            if (result.verdict === 'contended') {
              setNotice({ tone: 'warn', text: CONTENDED })

              return
            }

            setReserved(true)
          })
        }
      >
        {children}
      </Button>
      {(notice || reserved) && (
        <span aria-live="polite" className="basis-full">
          {notice ? (
            <InlineAlert tone={notice.tone}>{notice.text}</InlineAlert>
          ) : (
            <span className="block text-note leading-relaxed text-mint">
              {RESERVED}
            </span>
          )}
        </span>
      )}
    </>
  )
}
