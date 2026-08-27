'use client'

import { useState, useTransition } from 'react'

import {
  MARGIN_RANGE,
  PRIORITY_RANGE,
  wholeNumber,
  withinMargin,
  withinPriority,
} from '@/lib/reservations'
import type {
  ReservationRevision,
  ReservationWrite,
} from '@/repository/reservations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { InlineAlert } from '@/components/vela/banner'
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
} from '@/components/vela/field'

type Named = 'priority' | 'before' | 'after'

const SIGNED_OUT =
  'サインインが切れているため、操作できませんでした。サインインしてから開き直してください。'

const NOTHING_CHANGED = '変える値がありません。どれかを書き換えてください。'

export interface Booking {
  id: string
  title: string
  priority: number
  marginBeforeSeconds: number
  marginAfterSeconds: number
}

export function EditReservationDialog({
  booking,
  open,
  onOpenChange,
  onRevise,
}: {
  booking: Booking
  open: boolean
  onOpenChange: (open: boolean) => void
  onRevise: (
    id: string,
    revision: ReservationRevision,
  ) => Promise<ReservationWrite>
}) {
  const [priority, setPriority] = useState(String(booking.priority))
  const [before, setBefore] = useState(String(booking.marginBeforeSeconds))
  const [after, setAfter] = useState(String(booking.marginAfterSeconds))
  const [problem, setProblem] = useState<{ field: Named; text: string }>()
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()

  const close = (next: boolean) => {
    if (!next) {
      setPriority(String(booking.priority))
      setBefore(String(booking.marginBeforeSeconds))
      setAfter(String(booking.marginAfterSeconds))
      setProblem(undefined)
      setRefusal(undefined)
    }

    onOpenChange(next)
  }

  const submit = () => {
    const asked = wholeNumber(priority)

    if (asked === undefined || !withinPriority(asked)) {
      setProblem({
        field: 'priority',
        text: `優先度は ${PRIORITY_RANGE.least} 〜 ${PRIORITY_RANGE.most} の半角数字です。`,
      })

      return
    }

    const margins: [Named, string][] = [
      ['before', before],
      ['after', after],
    ]
    const read: Partial<Record<Named, number>> = {}

    for (const [field, value] of margins) {
      const seconds = wholeNumber(value)

      if (seconds === undefined || !withinMargin(seconds)) {
        setProblem({
          field,
          text: `マージンは ${MARGIN_RANGE.least} 〜 ${MARGIN_RANGE.most} 秒の半角数字です。`,
        })

        return
      }

      read[field] = seconds
    }

    const revision: ReservationRevision = {}

    if (asked !== booking.priority) {
      revision.priority = asked
    }

    if (read.before !== booking.marginBeforeSeconds) {
      revision.marginBeforeSeconds = read.before
    }

    if (read.after !== booking.marginAfterSeconds) {
      revision.marginAfterSeconds = read.after
    }

    if (Object.keys(revision).length === 0) {
      setProblem(undefined)
      setRefusal(NOTHING_CHANGED)

      return
    }

    setProblem(undefined)
    setRefusal(undefined)

    startTransition(async () => {
      const result = await onRevise(booking.id, revision)

      if (result.state === 'ok') {
        close(false)

        return
      }

      setRefusal(
        result.state === 'unauthenticated' ? SIGNED_OUT : result.message,
      )
    })
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      {/* Closing empties the form, so a press that lands beside it is treated
          as a miss rather than as a decision to throw the entry away. The X,
          キャンセル and Escape all still close it. */}
      <DialogContent onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>予約を編集</DialogTitle>
          <DialogDescription>
            {booking.title}{' '}
            の優先度とマージンを変えます。放送日時とチャンネルは番組表が決めるため、ここでは変えません。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="reservation-priority">優先度</FieldLabel>
            <Input
              id="reservation-priority"
              inputMode="numeric"
              value={priority}
              aria-invalid={problem?.field === 'priority' || undefined}
              aria-describedby={
                problem?.field === 'priority'
                  ? 'reservation-priority-error'
                  : undefined
              }
              onChange={(event) => setPriority(event.target.value)}
            />
            <FieldHint>
              数が大きいほど先にチューナーを取ります({PRIORITY_RANGE.least} 〜{' '}
              {PRIORITY_RANGE.most})
            </FieldHint>
            <span aria-live="polite">
              {problem?.field === 'priority' && (
                <FieldError id="reservation-priority-error">
                  {problem.text}
                </FieldError>
              )}
            </span>
          </Field>

          <Field>
            <FieldLabel htmlFor="reservation-margin-before">
              前マージン(秒)
            </FieldLabel>
            <Input
              id="reservation-margin-before"
              inputMode="numeric"
              value={before}
              aria-invalid={problem?.field === 'before' || undefined}
              aria-describedby={
                problem?.field === 'before'
                  ? 'reservation-margin-before-error'
                  : undefined
              }
              onChange={(event) => setBefore(event.target.value)}
            />
            <FieldHint>
              放送開始の何秒前から録画を始めるか(0 〜 {MARGIN_RANGE.most})
            </FieldHint>
            <span aria-live="polite">
              {problem?.field === 'before' && (
                <FieldError id="reservation-margin-before-error">
                  {problem.text}
                </FieldError>
              )}
            </span>
          </Field>

          <Field>
            <FieldLabel htmlFor="reservation-margin-after">
              後マージン(秒)
            </FieldLabel>
            <Input
              id="reservation-margin-after"
              inputMode="numeric"
              value={after}
              aria-invalid={problem?.field === 'after' || undefined}
              aria-describedby={
                problem?.field === 'after'
                  ? 'reservation-margin-after-error'
                  : undefined
              }
              onChange={(event) => setAfter(event.target.value)}
            />
            <FieldHint>
              放送終了の何秒後まで録画を続けるか(0 〜 {MARGIN_RANGE.most})
            </FieldHint>
            <span aria-live="polite">
              {problem?.field === 'after' && (
                <FieldError id="reservation-margin-after-error">
                  {problem.text}
                </FieldError>
              )}
            </span>
          </Field>

          <span aria-live="polite">
            {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
          </span>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)}>
            キャンセル
          </Button>
          <Button disabled={pending} onClick={submit}>
            保存する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
