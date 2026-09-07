'use client'

import { useState, useTransition } from 'react'

import { thresholdProblem } from '@/lib/quality'
import type {
  QualityThreshold,
  QualityThresholdKey,
  QualityWrite,
} from '@/repository/quality'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InlineAlert } from '@/components/vela/banner'
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
  RequiredMark,
} from '@/components/vela/field'

export function ThresholdDialog({
  thresholds,
  open,
  onOpenChange,
  onSave,
}: {
  thresholds: QualityThreshold[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (key: QualityThresholdKey, amount: number) => Promise<QualityWrite>
}) {
  const [key, setKey] = useState(thresholds[0].key)
  const [amount, setAmount] = useState(thresholds[0].amount)
  const [problem, setProblem] = useState<string>()
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()

  const chosen = thresholds.find((one) => one.key === key) ?? thresholds[0]
  const range = `${chosen.lowest} 〜 ${chosen.highest}${chosen.unit}`

  const choose = (next: string) => {
    const found = thresholds.find((one) => one.key === next) ?? thresholds[0]

    setKey(found.key)
    setAmount(found.amount)
    setProblem(undefined)
    setRefusal(undefined)
  }

  const submit = () => {
    const text = thresholdProblem(
      amount,
      chosen.lowest,
      chosen.highest,
      chosen.unit,
    )

    if (text) {
      setProblem(text)

      return
    }

    setProblem(undefined)
    setRefusal(undefined)

    startTransition(async () => {
      const result = await onSave(chosen.key, Number(amount))

      if (result.state === 'ok') {
        onOpenChange(false)

        return
      }

      setRefusal(
        result.state === 'unauthenticated'
          ? 'サインインが切れているため、変更できませんでした。'
          : result.message,
      )
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>閾値を変更</DialogTitle>
          <DialogDescription className="sr-only">
            品質の閾値を変更します。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="threshold-key">閾値</FieldLabel>
            <Select value={chosen.key} onValueChange={choose}>
              <SelectTrigger id="threshold-key">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {thresholds.map((one) => (
                  <SelectItem key={one.key} value={one.key}>
                    {one.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="threshold-amount">
              値
              <RequiredMark />
            </FieldLabel>
            <Input
              id="threshold-amount"
              inputMode="decimal"
              className="font-code tabular-nums"
              value={amount}
              aria-invalid={problem !== undefined || undefined}
              aria-describedby={problem ? 'threshold-amount-error' : undefined}
              onChange={(event) => setAmount(event.target.value)}
            />
            <FieldHint>
              {range} · 既定 {chosen.shipped}
            </FieldHint>
            <span aria-live="polite">
              {problem && (
                <FieldError id="threshold-amount-error">{problem}</FieldError>
              )}
            </span>
          </Field>

          <span aria-live="polite">
            {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
          </span>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button disabled={pending} onClick={submit}>
            変更する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
