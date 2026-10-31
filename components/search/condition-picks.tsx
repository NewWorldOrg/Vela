'use client'

import {
  SEARCH_DAY_OPTIONS,
  offeredSubgenres,
  searchDayLabelOf,
  searchDaysInOrder,
  subgenreLabelOf,
} from '@/lib/search-condition'
import type { SearchDay, SearchGenre } from '@/lib/search-condition'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from '@/components/ui/select'
import { CloseIcon } from '@/components/vela/icons'

export function Pick({
  label,
  spoken,
  onRemove,
}: {
  label: string
  spoken: string
  onRemove: () => void
}) {
  return (
    <span className="inline-flex items-center gap-[calc(7rem/16)] rounded-full border border-brand bg-brand-soft py-1 pr-1.5 pl-3 text-sub font-bold text-brand">
      {label}
      <button
        type="button"
        aria-label={spoken}
        onClick={onRemove}
        className="tap-target flex size-[calc(18rem/16)] shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface text-brand [&_svg]:size-2.5"
      >
        <CloseIcon />
      </button>
    </span>
  )
}

export function SubgenrePicks({
  genres,
  subgenres,
  onChange,
}: {
  genres: SearchGenre[]
  subgenres: string[]
  onChange: (subgenres: string[]) => void
}) {
  const offered = offeredSubgenres(genres, subgenres)

  return (
    <>
      {subgenres.map((subgenre) => (
        <Pick
          key={subgenre}
          label={subgenreLabelOf(subgenre)}
          spoken={`サブジャンル ${subgenreLabelOf(subgenre)} を外す`}
          onRemove={() => onChange(subgenres.filter((one) => one !== subgenre))}
        />
      ))}
      {offered.length > 0 && (
        <Select
          value=""
          onValueChange={(value) => onChange([...subgenres, value])}
        >
          <SelectTrigger
            size="sm"
            aria-label="サブジャンルを追加"
            className="w-fit rounded-full text-ink-2"
          >
            ＋ サブジャンルを追加
          </SelectTrigger>
          <SelectContent>
            {offered.map((group) => (
              <SelectGroup key={group.kind}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.under.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      )}
    </>
  )
}

export function DayPicks({
  days,
  onChange,
}: {
  days: SearchDay[]
  onChange: (days: SearchDay[]) => void
}) {
  const unused = SEARCH_DAY_OPTIONS.filter(
    (option) => !days.includes(option.value),
  )

  return (
    <>
      {days.map((day) => (
        <Pick
          key={day}
          label={searchDayLabelOf(day)}
          spoken={`曜日 ${searchDayLabelOf(day)} を外す`}
          onRemove={() => onChange(days.filter((one) => one !== day))}
        />
      ))}
      {unused.length > 0 && (
        <Select
          value=""
          onValueChange={(value) =>
            onChange(searchDaysInOrder([...days, value as SearchDay]))
          }
        >
          <SelectTrigger
            size="sm"
            aria-label="曜日を追加"
            className="w-fit rounded-full text-ink-2"
          >
            ＋ 曜日を追加
          </SelectTrigger>
          <SelectContent>
            {unused.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </>
  )
}
