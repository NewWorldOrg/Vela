'use client'

import { useId, useState, useTransition, type FormEvent } from 'react'

import type { Residence } from '@/lib/bml/receiver-info'
import {
  NOT_REGISTERED,
  POSTAL_CODE_LABEL,
  PREFECTURES,
  PREFECTURE_LABEL,
  postalCodeProblem,
  postalCodeShown,
  postalCodeToSend,
  postalCodeTyped,
  prefectureShown,
  residenceRefusalOf,
} from '@/lib/residence'
import type { ResidenceWrite } from '@/repository/data-broadcast-settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldError } from '@/components/vela/field'
import { Spinner } from '@/components/vela/progress'
import { Surface } from '@/components/vela/surface'
import { ValueRow, ValueRows } from '@/components/segments/value-rows'

export const RESIDENCE_SLOT = 'residence'

const NONE = 'none'

export type SettleResidence = (residence: Residence) => Promise<ResidenceWrite>

function prefectureOf(chosen: string): number | null {
  return chosen === NONE ? null : Number(chosen)
}

/** Where the receiver is, as the documents of a data broadcast read it: the postal code and the prefecture as values, which `変更` turns into a field and a list in place, saved together. */
export function ResidencePanel({
  residence,
  onSettle,
}: {
  residence: Residence
  onSettle: SettleResidence
}) {
  const [editing, setEditing] = useState(false)
  const [typed, setTyped] = useState('')
  const [chosen, setChosen] = useState(NONE)
  const [checking, setChecking] = useState(false)
  const [refusal, setRefusal] = useState<string>()
  const [returned, setReturned] = useState(false)
  const [pending, startTransition] = useTransition()
  const id = useId()
  const postalId = `${id}-postal-code`
  const prefectureId = `${id}-prefecture`
  const errorId = `${id}-error`
  const problem = checking ? postalCodeProblem(typed) : undefined
  const said = problem ?? refusal

  const edit = () => {
    setTyped(postalCodeTyped(residence.postalCode))
    setChosen(
      residence.prefecture === null ? NONE : String(residence.prefecture),
    )
    setChecking(false)
    setRefusal(undefined)
    setEditing(true)
  }

  const leave = () => {
    setEditing(false)
    setChecking(false)
    setRefusal(undefined)
    setReturned(true)
  }

  const retype = (next: string) => {
    setTyped(next)
    setRefusal(undefined)
  }

  const choose = (next: string) => {
    setChosen(next)
    setRefusal(undefined)
  }

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!editing || pending) {
      return
    }

    setChecking(true)
    setRefusal(undefined)

    if (postalCodeProblem(typed) !== undefined) {
      return
    }

    const next: Residence = {
      postalCode: postalCodeToSend(typed),
      prefecture: prefectureOf(chosen),
    }

    startTransition(async () => {
      const result = await onSettle(next)

      if (result.state === 'ok') {
        leave()

        return
      }

      setRefusal(residenceRefusalOf(result.state))
    })
  }

  return (
    <Surface data-slot={RESIDENCE_SLOT}>
      <form noValidate onSubmit={save}>
        <ValueRows>
          <ValueRow
            name={
              editing ? (
                <label htmlFor={postalId}>{POSTAL_CODE_LABEL}</label>
              ) : (
                POSTAL_CODE_LABEL
              )
            }
          >
            {editing ? (
              <span className="flex items-center font-sans">
                <Input
                  id={postalId}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  autoFocus
                  areaClassName="w-[calc(130rem/16)]"
                  className="font-code tabular-nums"
                  value={typed}
                  readOnly={pending}
                  aria-invalid={problem ? true : undefined}
                  aria-describedby={said ? errorId : undefined}
                  onChange={(event) => retype(event.target.value)}
                />
              </span>
            ) : (
              postalCodeShown(residence.postalCode)
            )}
          </ValueRow>
          <ValueRow
            name={
              editing ? (
                <label htmlFor={prefectureId}>{PREFECTURE_LABEL}</label>
              ) : (
                PREFECTURE_LABEL
              )
            }
          >
            {editing ? (
              <span className="flex items-center font-sans">
                <Select
                  value={chosen}
                  disabled={pending}
                  onValueChange={choose}
                >
                  <SelectTrigger
                    id={prefectureId}
                    size="sm"
                    className="w-full max-w-[calc(260rem/16)]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{NOT_REGISTERED}</SelectItem>
                    {PREFECTURES.map(({ value, label }) => (
                      <SelectItem key={value} value={String(value)}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </span>
            ) : (
              <span className="font-sans">
                {prefectureShown(residence.prefecture)}
              </span>
            )}
          </ValueRow>
        </ValueRows>
        <span aria-live="polite">
          {editing && said && (
            <FieldError id={errorId} className="mt-2.5">
              {said}
            </FieldError>
          )}
        </span>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2.5 border-t border-dashed border-line pt-3">
          {editing ? (
            <>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={leave}
              >
                キャンセル
              </Button>
              <Button type="submit" aria-disabled={pending}>
                {pending && <Spinner size="control" />}
                保存する
              </Button>
            </>
          ) : (
            <Button
              key="change"
              type="button"
              variant="tone"
              size="sm"
              autoFocus={returned}
              onClick={edit}
            >
              変更
            </Button>
          )}
        </div>
      </form>
    </Surface>
  )
}
