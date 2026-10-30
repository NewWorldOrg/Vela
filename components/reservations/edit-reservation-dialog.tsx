'use client'

import { useState, useTransition } from 'react'

import {
  MARGIN_RANGE,
  PRIORITY_RANGE,
  wholeNumber,
  withinMargin,
  withinPriority,
} from '@/lib/reservations'
import { signedOut } from '@/lib/signed-out'
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
import { Switch } from '@/components/ui/switch'
import { InlineAlert } from '@/components/vela/banner'
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
  RequiredMark,
} from '@/components/vela/field'

type Named = 'priority' | 'before' | 'after'

const SIGNED_OUT = signedOut('操作')

const NOTHING_CHANGED = '変える値がありません。どれかを書き換えてください。'

export interface Booking {
  id: string
  title: string
  priority: number
  marginBeforeSeconds: number
  marginAfterSeconds: number
  encodeWhenRecorded: boolean
}

export function EditReservationDialog({
  booking,
  open,
  onOpenChange,
  onRevise,
  inline = false,
}: {
  /** Drawn in the page's flow under the row it changes, as a phone held upright opens it, rather than as a dialog. */
  inline?: boolean
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
  const [encode, setEncode] = useState(booking.encodeWhenRecorded)
  const [problem, setProblem] = useState<{ field: Named; text: string }>()
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()

  const close = (next: boolean) => {
    if (!next) {
      setPriority(String(booking.priority))
      setBefore(String(booking.marginBeforeSeconds))
      setAfter(String(booking.marginAfterSeconds))
      setEncode(booking.encodeWhenRecorded)
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

    if (encode !== booking.encodeWhenRecorded) {
      revision.encodeWhenRecorded = encode
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

  const ids = inline ? `-${booking.id}` : ''
  const fields = (
    <div
      data-slot="dialog-body"
      className="flex min-h-0 flex-col gap-4 overflow-y-auto"
    >
      <Field>
        <FieldLabel htmlFor={`reservation-priority${ids}`}>
          優先度
          <RequiredMark />
        </FieldLabel>
        <Input
          id={`reservation-priority${ids}`}
          inputMode="numeric"
          value={priority}
          aria-invalid={problem?.field === 'priority' || undefined}
          aria-describedby={
            problem?.field === 'priority'
              ? `reservation-priority-error${ids}`
              : undefined
          }
          onChange={(event) => setPriority(event.target.value)}
        />
        <FieldHint>
          {PRIORITY_RANGE.least} 〜 {PRIORITY_RANGE.most}
        </FieldHint>
        <span aria-live="polite">
          {problem?.field === 'priority' && (
            <FieldError id={`reservation-priority-error${ids}`}>
              {problem.text}
            </FieldError>
          )}
        </span>
      </Field>

      <Field>
        <FieldLabel htmlFor={`reservation-margin-before${ids}`}>
          前マージン(秒)
          <RequiredMark />
        </FieldLabel>
        <Input
          id={`reservation-margin-before${ids}`}
          inputMode="numeric"
          value={before}
          aria-invalid={problem?.field === 'before' || undefined}
          aria-describedby={
            problem?.field === 'before'
              ? `reservation-margin-before-error${ids}`
              : undefined
          }
          onChange={(event) => setBefore(event.target.value)}
        />
        <FieldHint>
          {MARGIN_RANGE.least} 〜 {MARGIN_RANGE.most}
        </FieldHint>
        <span aria-live="polite">
          {problem?.field === 'before' && (
            <FieldError id={`reservation-margin-before-error${ids}`}>
              {problem.text}
            </FieldError>
          )}
        </span>
      </Field>

      <Field>
        <FieldLabel htmlFor={`reservation-margin-after${ids}`}>
          後マージン(秒)
          <RequiredMark />
        </FieldLabel>
        <Input
          id={`reservation-margin-after${ids}`}
          inputMode="numeric"
          value={after}
          aria-invalid={problem?.field === 'after' || undefined}
          aria-describedby={
            problem?.field === 'after'
              ? `reservation-margin-after-error${ids}`
              : undefined
          }
          onChange={(event) => setAfter(event.target.value)}
        />
        <FieldHint>
          {MARGIN_RANGE.least} 〜 {MARGIN_RANGE.most}
        </FieldHint>
        <span aria-live="polite">
          {problem?.field === 'after' && (
            <FieldError id={`reservation-margin-after-error${ids}`}>
              {problem.text}
            </FieldError>
          )}
        </span>
      </Field>

      <div className="flex flex-wrap items-center gap-2.5">
        <Switch
          id={`reservation-encode${ids}`}
          checked={encode}
          onCheckedChange={setEncode}
        />
        <FieldLabel htmlFor={`reservation-encode${ids}`}>
          自動エンコード
        </FieldLabel>
      </div>

      <span aria-live="polite">
        {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
      </span>
    </div>
  )
  const choices = (
    <>
      <Button variant="ghost" onClick={() => close(false)}>
        キャンセル
      </Button>
      <Button disabled={pending} onClick={submit}>
        保存する
      </Button>
    </>
  )

  if (inline) {
    return open ? (
      <div
        data-slot="reservation-change"
        className="flex flex-col gap-4 [&_input]:h-11"
      >
        {fields}
        <div className="flex flex-wrap justify-end gap-2">{choices}</div>
      </div>
    ) : null
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>予約を変更</DialogTitle>
          <DialogDescription>{booking.title}</DialogDescription>
        </DialogHeader>
        {fields}
        <DialogFooter>{choices}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
