'use client'

import { useState, useTransition } from 'react'

import { SILENCE_RANGE, withinSilence } from '@/lib/tuners'
import type { TunerWriteResult } from '@/repository/tuners'
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

const SIGNED_OUT =
  'サインインが切れているため、操作できませんでした。サインインしてから開き直してください。'

const OUT_OF_RANGE = `しきい値は ${SILENCE_RANGE.least} 〜 ${SILENCE_RANGE.most} 時間の半角数字です。`

export function ThresholdDialog({
  hours,
  open,
  onOpenChange,
  onSave,
}: {
  hours: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (hours: number) => Promise<TunerWriteResult>
}) {
  const [asked, setAsked] = useState(String(hours))
  const [problem, setProblem] = useState<string>()
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()

  const submit = () => {
    const trimmed = asked.trim()
    const wanted = /^\d+$/.test(trimmed) ? Number(trimmed) : undefined

    if (wanted === undefined || !withinSilence(wanted)) {
      setProblem(OUT_OF_RANGE)

      return
    }

    setProblem(undefined)
    setRefusal(undefined)

    startTransition(async () => {
      const result = await onSave(wanted)

      if (result.state === 'ok') {
        onOpenChange(false)

        return
      }

      setRefusal(
        result.state === 'unauthenticated' ? SIGNED_OUT : result.message,
      )
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Closing empties the form, so a press that lands beside it is treated
          as a miss rather than as a decision to throw the entry away. The X,
          キャンセル and Escape all still close it. */}
      <DialogContent onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>健全性のしきい値を変更</DialogTitle>
          <DialogDescription>
            種別単位でサービス取得が連続して 0
            件だった時間が、この長さを超えると警告になります。
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="tuner-threshold">しきい値(時間)</FieldLabel>
          <Input
            id="tuner-threshold"
            inputMode="numeric"
            value={asked}
            aria-invalid={problem !== undefined || undefined}
            aria-describedby={problem ? 'tuner-threshold-error' : undefined}
            onChange={(event) => setAsked(event.target.value)}
          />
          <FieldHint>
            {SILENCE_RANGE.least} 〜 {SILENCE_RANGE.most} 時間
          </FieldHint>
          <span aria-live="polite">
            {problem && (
              <FieldError id="tuner-threshold-error">{problem}</FieldError>
            )}
          </span>
        </Field>

        <span aria-live="polite">
          {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
        </span>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
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
