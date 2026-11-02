'use client'

import {
  useId,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from 'react'

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
import {
  SETTINGS_GROUP_TITLE,
  SettingsGroup,
  SettingsRow,
} from '@/components/vela/settings-rows'

export const RESIDENCE_SLOT = 'residence'

const NONE = 'none'

export type SettleResidence = (residence: Residence) => Promise<ResidenceWrite>

function prefectureOf(chosen: string): number | null {
  return chosen === NONE ? null : Number(chosen)
}

/** Where the receiver is, as the documents of a data broadcast read it: the postal code and the prefecture as values, which `変更` turns into a field and a list in place, saved together. */
export function ResidencePanel({
  heading,
  residence,
  onSettle,
}: {
  heading: ReactNode
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
    <form noValidate onSubmit={save} data-slot={RESIDENCE_SLOT}>
      <div className="flex items-end justify-between gap-3">
        <h2 className={SETTINGS_GROUP_TITLE}>{heading}</h2>
        {!editing && (
          <Button
            key="change"
            type="button"
            variant="tone"
            size="sm"
            className="mb-1"
            autoFocus={returned}
            onClick={edit}
          >
            変更
          </Button>
        )}
      </div>
      <SettingsGroup>
        <SettingsRow
          name={
            editing ? (
              <label htmlFor={postalId}>{POSTAL_CODE_LABEL}</label>
            ) : (
              POSTAL_CODE_LABEL
            )
          }
        >
          {editing ? (
            <Input
              id={postalId}
              inputMode="numeric"
              autoComplete="postal-code"
              autoFocus
              areaClassName="w-[calc(130rem/16)]"
              className="bg-bg tabular-nums"
              value={typed}
              readOnly={pending}
              aria-invalid={problem ? true : undefined}
              aria-describedby={said ? errorId : undefined}
              onChange={(event) => retype(event.target.value)}
            />
          ) : (
            postalCodeShown(residence.postalCode)
          )}
        </SettingsRow>
        <SettingsRow
          name={
            editing ? (
              <label htmlFor={prefectureId}>{PREFECTURE_LABEL}</label>
            ) : (
              PREFECTURE_LABEL
            )
          }
        >
          {editing ? (
            <Select value={chosen} disabled={pending} onValueChange={choose}>
              <SelectTrigger
                id={prefectureId}
                size="sm"
                className="w-[calc(220rem/16)] max-w-full bg-bg"
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
          ) : (
            prefectureShown(residence.prefecture)
          )}
        </SettingsRow>
        {editing && (
          <SettingsRow
            name={
              <span aria-live="polite">
                {said && <FieldError id={errorId}>{said}</FieldError>}
              </span>
            }
          >
            <div className="flex items-center gap-2">
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
            </div>
          </SettingsRow>
        )}
      </SettingsGroup>
    </form>
  )
}
