'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import {
  SEARCH_DAY_OPTIONS,
  SEARCH_DEFAULT_FIELDS,
  SEARCH_FIELD_OPTIONS,
  SEARCH_GENRE_OPTIONS,
  SEARCH_KIND_OPTIONS,
  SEARCH_MOST_CHANNELS,
  genreLabelOf,
  namesSomeDays,
} from '@/repository/search-options'
import type {
  SearchField,
  SearchGenre,
  SearchKind,
} from '@/repository/search-options'
import { searchDaysInOrder, subgenreLabelOf } from '@/lib/search-condition'
import type { GuideChannel } from '@/repository/programs'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { ChevronDownIcon } from '@/components/vela/icons'
import { SubgenrePicks } from '@/components/search/condition-picks'
import type { SearchDraft } from '@/components/search/search-draft'

const EVERY = 'すべて'

const EVERY_KIND = 'all'

/** A condition's pill: its name, then what it is set to; tinted while it narrows the search. */
export const CONDITION_CHIP =
  'tap-target inline-flex h-8 max-w-[calc(280rem/16)] min-w-0 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-ui whitespace-nowrap outline-none transition-[background-color,color,transform] duration-[140ms] ease-toy active:scale-[0.98] focus-visible:shadow-ring phone:h-10 [&_svg]:size-3.5 [&_svg]:shrink-0'

function chipTone(on: boolean): string {
  return on
    ? 'bg-accent-tint text-acc-text hover:bg-accent-tint'
    : 'bg-surface text-ink hover:bg-surface-2'
}

function ChipWords({ name, value }: { name: string; value: string }) {
  return (
    <>
      <span className="font-medium">{name}</span>
      <b className="min-w-0 truncate font-semibold">{value}</b>
    </>
  )
}

/** A choice pressed on and off inside a condition's panel. */
export function TogglePill({
  on,
  disabled,
  onPress,
  children,
}: {
  on: boolean
  disabled?: boolean
  onPress: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onPress}
      className={cn(
        'tap-target inline-flex h-8 cursor-pointer items-center rounded-full px-3 text-ui whitespace-nowrap outline-none transition-[background-color,color,transform] duration-[140ms] ease-toy enabled:active:scale-[0.98] focus-visible:shadow-ring disabled:cursor-not-allowed disabled:opacity-40',
        on
          ? 'bg-accent-tint font-semibold text-acc-text'
          : 'bg-surface font-medium text-ink enabled:hover:bg-surface-2',
      )}
    >
      {children}
    </button>
  )
}

function PanelLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-sub font-semibold text-ink-2 [&:not(:first-child)]:mt-4">
      {children}
    </p>
  )
}

/** A condition whose panel opens under its pill; what is set inside is searched when the panel closes. */
function PanelChip({
  name,
  value,
  on,
  onClose,
  wide = false,
  children,
}: {
  name: string
  value: string
  on: boolean
  onClose: () => void
  wide?: boolean
  children: ReactNode
}) {
  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <PopoverTrigger
        data-condition-chip={name}
        className={cn(CONDITION_CHIP, chipTone(on))}
      >
        <ChipWords name={name} value={value} />
        <ChevronDownIcon />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={16}
        aria-label={name}
        className={cn(
          'max-h-[min(60dvh,calc(480rem/16))] w-[min(calc(340rem/16),calc(100vw-32px))] p-4',
          wide && 'w-[min(calc(460rem/16),calc(100vw-32px))]',
        )}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}

/** A condition with one answer, picked from a list under its pill and searched at once. */
function ListChip({
  name,
  value,
  on,
  current,
  options,
  onPick,
}: {
  name: string
  value: string
  on: boolean
  current: string
  options: { value: string; label: string }[]
  onPick: (next: string) => void
}) {
  return (
    <Select value={current} onValueChange={onPick}>
      <SelectTrigger
        size="sm"
        aria-label={name}
        data-condition-chip={name}
        className={cn(
          CONDITION_CHIP,
          'w-fit justify-start gap-1.5 bg-surface px-3 data-[size=sm]:h-8 phone:data-[size=sm]:h-10 [&_svg]:text-current!',
          chipTone(on),
        )}
      >
        <ChipWords name={name} value={value} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function periodOf(date: string | undefined): string {
  if (!date) {
    return ''
  }

  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
}

/** The conditions of a search as a row of pills, each opening what it sets: kind, genre, weekday, channel, where the words are looked for, period and the words to leave out. */
export function ConditionChips({
  draft,
  channels,
  amend,
  settle,
  formId,
  clear,
  className,
}: {
  draft: SearchDraft
  channels: GuideChannel[]
  /** Changes the conditions being set, searching nothing yet. */
  amend: (part: Partial<SearchDraft>) => void
  /** Searches the conditions as set, with `part` put in first. */
  settle: (part?: Partial<SearchDraft>) => void
  /** The form the words left out are sent with. */
  formId: string
  /** Puts every condition back, shown while any is set. */
  clear?: () => void
  className?: string
}) {
  const channelNameOf = (id: string): string =>
    channels.find((channel) => channel.id === id)?.name || id
  const offeredChannels = channels.filter(
    (channel) => !draft.kind || channel.kind === draft.kind,
  )
  const genreWords = [
    ...draft.genres.map(genreLabelOf),
    ...draft.subgenres.map(subgenreLabelOf),
  ]
  const someDays = namesSomeDays(draft.days)
  const period =
    draft.from || draft.to
      ? `${periodOf(draft.from)}〜${periodOf(draft.to)}`
      : EVERY
  const atTheMost = draft.channels.length >= SEARCH_MOST_CHANNELS

  const toggled = <T,>(list: T[], one: T): T[] =>
    list.includes(one) ? list.filter((each) => each !== one) : [...list, one]

  return (
    <ul
      aria-label="検索条件"
      data-slot="search-conditions"
      className={cn('flex gap-x-2 gap-y-3', className)}
    >
      <li className="flex shrink-0">
        <ListChip
          name="種別"
          value={
            SEARCH_KIND_OPTIONS.find((option) => option.value === draft.kind)
              ?.label ?? EVERY
          }
          on={Boolean(draft.kind)}
          current={draft.kind ?? EVERY_KIND}
          options={[
            { value: EVERY_KIND, label: EVERY },
            ...SEARCH_KIND_OPTIONS,
          ]}
          onPick={(value) =>
            settle({
              kind: value === EVERY_KIND ? undefined : (value as SearchKind),
              channels: [],
            })
          }
        />
      </li>
      <li className="flex shrink-0">
        <PanelChip
          name="ジャンル"
          value={genreWords.length > 0 ? genreWords.join('・') : EVERY}
          on={genreWords.length > 0}
          onClose={() => settle()}
          wide
        >
          <div
            role="group"
            aria-label="ジャンル"
            className="flex flex-wrap gap-2"
          >
            {SEARCH_GENRE_OPTIONS.map((option) => (
              <TogglePill
                key={option.value}
                on={draft.genres.includes(option.value)}
                onPress={() =>
                  amend({
                    genres: toggled<SearchGenre>(draft.genres, option.value),
                  })
                }
              >
                {option.label}
              </TogglePill>
            ))}
          </div>
          <PanelLabel>サブジャンル</PanelLabel>
          <div className="flex flex-wrap items-center gap-2">
            <SubgenrePicks
              genres={draft.genres}
              subgenres={draft.subgenres}
              onChange={(subgenres) => amend({ subgenres })}
            />
          </div>
        </PanelChip>
      </li>
      <li className="flex shrink-0">
        <PanelChip
          name="曜日"
          value={
            someDays
              ? SEARCH_DAY_OPTIONS.filter((option) =>
                  draft.days.includes(option.value),
                )
                  .map((option) => option.short)
                  .join('・')
              : EVERY
          }
          on={someDays}
          onClose={() => settle()}
        >
          <div role="group" aria-label="曜日" className="flex flex-wrap gap-2">
            {SEARCH_DAY_OPTIONS.map((option) => (
              <TogglePill
                key={option.value}
                on={draft.days.includes(option.value)}
                onPress={() =>
                  amend({
                    days: searchDaysInOrder(toggled(draft.days, option.value)),
                  })
                }
              >
                {option.label}
              </TogglePill>
            ))}
          </div>
        </PanelChip>
      </li>
      <li className="flex shrink-0">
        <PanelChip
          name="チャンネル"
          value={
            draft.channels.length > 0
              ? draft.channels.map(channelNameOf).join('・')
              : EVERY
          }
          on={draft.channels.length > 0}
          onClose={() => settle()}
          wide
        >
          <div
            role="group"
            aria-label="チャンネル"
            className="flex flex-wrap gap-2"
          >
            {offeredChannels.map((channel) => {
              const on = draft.channels.includes(channel.id)

              return (
                <TogglePill
                  key={channel.id}
                  on={on}
                  disabled={!on && atTheMost}
                  onPress={() =>
                    amend({ channels: toggled(draft.channels, channel.id) })
                  }
                >
                  {channel.name}
                </TogglePill>
              )
            })}
          </div>
          {atTheMost && (
            <p className="mt-3 text-sub text-ink-2">
              チャンネルは {SEARCH_MOST_CHANNELS} 局まで指定できます
            </p>
          )}
        </PanelChip>
      </li>
      <li className="flex shrink-0">
        <ListChip
          name="対象範囲"
          value={
            SEARCH_FIELD_OPTIONS.find((option) => option.value === draft.fields)
              ?.label ?? ''
          }
          on={draft.fields !== SEARCH_DEFAULT_FIELDS}
          current={draft.fields}
          options={SEARCH_FIELD_OPTIONS}
          onPick={(value) => settle({ fields: value as SearchField })}
        />
      </li>
      <li className="flex shrink-0">
        <PanelChip
          name="期間"
          value={period}
          on={Boolean(draft.from || draft.to)}
          onClose={() => settle()}
        >
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label="期間の開始日"
              value={draft.from ?? ''}
              onChange={(event) =>
                amend({ from: event.target.value || undefined })
              }
              areaClassName="min-w-0 flex-1"
              className="bg-surface"
            />
            <span aria-hidden="true" className="text-ink-2">
              〜
            </span>
            <Input
              type="date"
              aria-label="期間の終了日"
              value={draft.to ?? ''}
              onChange={(event) =>
                amend({ to: event.target.value || undefined })
              }
              areaClassName="min-w-0 flex-1"
              className="bg-surface"
            />
          </div>
        </PanelChip>
      </li>
      <li className="flex shrink-0">
        <PanelChip
          name="除外キーワード"
          value={draft.exclude.trim() || 'なし'}
          on={draft.exclude.trim() !== ''}
          onClose={() => settle()}
        >
          <Input
            form={formId}
            aria-label="除外キーワード"
            enterKeyHint="search"
            value={draft.exclude}
            onChange={(event) => amend({ exclude: event.target.value })}
            className="bg-surface"
          />
        </PanelChip>
      </li>
      {clear && (
        <li className="flex shrink-0">
          <button
            type="button"
            onClick={clear}
            className="tap-target h-8 shrink-0 cursor-pointer rounded-full px-2.5 text-ui font-medium whitespace-nowrap text-ink-2 outline-none hover:text-ink focus-visible:shadow-ring phone:h-10"
          >
            条件を解除
          </button>
        </li>
      )}
    </ul>
  )
}
