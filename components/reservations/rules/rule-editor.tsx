'use client'

import type { ComponentProps, ReactNode } from 'react'
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from 'react'
import type { Route } from 'next'
import Link from 'next/link'

import { formatMoment } from '@/lib/format'
import {
  MARGIN_RANGE,
  PRIORITY_RANGE,
  wholeNumber,
  withinMargin,
  withinPriority,
} from '@/lib/reservations'
import {
  RULE_DEFAULT_PRIORITY,
  RULE_MARK_OPTIONS,
  RULE_NAME_LONGEST,
  RULE_PERIOD_LONGEST_DAYS,
  RULE_TAKES_SHOWN,
  ruleMarkLabelOf,
  ruleMarksInOrder,
  ruleNarrowsAnything,
  withinRuleName,
  withinRulePeriod,
} from '@/lib/rules'
import type { RuleMark } from '@/lib/rules'
import { cn } from '@/lib/utils'
import type { GuideChannel } from '@/repository/programs'
import type {
  Rule,
  RuleDraft,
  RuleImpact,
  RulePreview,
  RuleTerms,
  RuleWrite,
} from '@/repository/rules'
import {
  SEARCH_DEFAULT_PER_PAGE,
  SEARCH_DEFAULT_SORT,
  SEARCH_FIELD_OPTIONS,
  SEARCH_GENRE_OPTIONS,
  SEARCH_KIND_OPTIONS,
  SEARCH_MOST_CHANNELS,
  genreLabelOf,
  searchQueryOf,
} from '@/repository/search-options'
import type {
  SearchField,
  SearchGenre,
  SearchKind,
} from '@/repository/search-options'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { InlineAlert } from '@/components/vela/inline-alert'
import { EmptyState } from '@/components/vela/empty-state'
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
  RequiredMark,
} from '@/components/vela/field'
import {
  CloseIcon,
  PlusIcon,
  TrashIcon,
  WarningIcon,
} from '@/components/vela/icons'
import { GenreDot } from '@/components/reservations/genre-dot'
import { Stepper } from '@/components/reservations/stepper'
import { SegmentedControl } from '@/components/vela/segmented-control'
import type { Genre } from '@/repository/programs'
import {
  SEARCH_DAY_OPTIONS,
  offeredSubgenres,
  searchDaysInOrder,
  subgenreLabelOf,
} from '@/lib/search-condition'
import type { RuleActions } from '@/components/reservations/rules-view'
import { SIGNED_OUT } from '@/components/reservations/rules/signed-out'
import { Count } from '@/components/reservations/rules/count'
import { Excluded } from '@/components/reservations/rules/excluded'

const EVERY_KIND = 'all'

const NOTHING_NARROWS =
  'キーワード・除外キーワード・ジャンル・サブジャンル・種別・チャンネル・曜日・期間・印・除外する印のうち、1 つ以上を指定してください。'

const PERIOD_OUT_OF_RANGE = `期間は開始日から終了日へ向かう最長 ${RULE_PERIOD_LONGEST_DAYS} 日の範囲で指定できます。`

const MATCHES_SETTLE_MS = 500

const EVERY_DAY = SEARCH_DAY_OPTIONS.map((day) => day.value)

interface Named {
  field: 'name' | 'terms' | 'period' | 'priority' | 'before' | 'after'
  text: string
}

interface Entry {
  name: string
  q: string
  exclude: string
  fields: SearchField
  genres: SearchGenre[]
  subgenres: RuleTerms['subgenres']
  kind?: SearchKind
  channels: string[]
  days: RuleTerms['days']
  marks: RuleTerms['marks']
  excludedMarks: RuleTerms['excludedMarks']
  from?: string
  to?: string
  beyond: RuleTerms['beyond']
  priority: string
  before: string
  after: string
  enabled: boolean
  encodeWhenRecorded: boolean
}

function entryOf(rule: Rule | undefined, terms: RuleTerms): Entry {
  return {
    name: rule?.name ?? '',
    q: terms.q ?? '',
    exclude: terms.exclude ?? '',
    fields: terms.fields,
    genres: terms.genres,
    subgenres: terms.subgenres,
    kind: terms.kind,
    channels: terms.channels,
    days: terms.days,
    marks: terms.marks,
    excludedMarks: terms.excludedMarks,
    from: terms.from,
    to: terms.to,
    beyond: terms.beyond,
    priority: String(rule?.priority ?? RULE_DEFAULT_PRIORITY),
    before: String(rule?.marginBeforeSeconds ?? 0),
    after: String(rule?.marginAfterSeconds ?? 0),
    enabled: rule?.enabled ?? true,
    encodeWhenRecorded: rule?.encodeWhenRecorded ?? true,
  }
}

function termsOfEntry(entry: Entry): RuleTerms {
  return {
    q: entry.q.trim() || undefined,
    exclude: entry.exclude.trim() || undefined,
    fields: entry.fields,
    genres: entry.genres,
    subgenres: entry.subgenres,
    kind: entry.kind,
    channels: entry.channels,
    days: entry.days,
    marks: entry.marks,
    excludedMarks: entry.excludedMarks,
    from: entry.from,
    to: entry.to,
    beyond: entry.beyond,
  }
}

function draftOf(rule: Rule): RuleDraft {
  return {
    name: rule.name,
    terms: rule.terms,
    priority: rule.priority,
    enabled: rule.enabled,
    marginBeforeSeconds: rule.marginBeforeSeconds,
    marginAfterSeconds: rule.marginAfterSeconds,
    encodeWhenRecorded: rule.encodeWhenRecorded,
  }
}

function termsProblemOf(terms: RuleTerms): Named | undefined {
  if (!ruleNarrowsAnything(terms)) {
    return { field: 'terms', text: NOTHING_NARROWS }
  }

  if (!withinRulePeriod(terms.from, terms.to)) {
    return { field: 'period', text: PERIOD_OUT_OF_RANGE }
  }

  return undefined
}

function numberWithin(
  value: string,
  within: (number: number) => boolean,
  orElse: number,
): number {
  const number = wholeNumber(value)

  return number !== undefined && within(number) ? number : orElse
}

export function RuleEditor({
  rule,
  terms,
  channels,
  actions,
  onOpen,
  onClose,
}: {
  rule?: Rule
  terms: RuleTerms
  channels: GuideChannel[]
  actions: RuleActions
  onOpen: (id: string) => void
  onClose: () => void
}) {
  const [entry, setEntry] = useState<Entry>(() => entryOf(rule, terms))
  const [problem, setProblem] = useState<Named>()
  const [refusal, setRefusal] = useState<string>()
  const [preview, setPreview] = useState<RulePreview>()
  const [shownFor, setShownFor] = useState<string>()
  const [impact, setImpact] = useState<RuleImpact>()
  const [leaving, setLeaving] = useState<RuleImpact>()
  const [confirming, setConfirming] = useState(false)
  const [retiring, setRetiring] = useState(false)
  const [pending, startTransition] = useTransition()
  const [, startPreviewing] = useTransition()

  const asks = useRef(0)

  const amend = (part: Partial<Entry>): void => {
    setEntry((previous) => ({ ...previous, ...part }))
  }

  const asked: RuleTerms = termsOfEntry(entry)
  const conditions = JSON.stringify(asked)
  const stale = preview !== undefined && shownFor !== conditions
  const everyDay = entry.days.length === EVERY_DAY.length
  const unusedGenres = SEARCH_GENRE_OPTIONS.filter(
    (option) => !entry.genres.includes(option.value),
  )
  const unusedChannels = channels.filter(
    (channel) =>
      (!entry.kind || channel.kind === entry.kind) &&
      !entry.channels.includes(channel.id),
  )
  const unnamedMarks = RULE_MARK_OPTIONS.filter(
    (option) =>
      !entry.marks.includes(option.value) &&
      !entry.excludedMarks.includes(option.value),
  )
  const channelNameOf = (id: string): string =>
    channels.find((channel) => channel.id === id)?.name || id
  const written = searchQueryOf({
    ...asked,
    sort: SEARCH_DEFAULT_SORT,
    perPage: SEARCH_DEFAULT_PER_PAGE,
    page: 1,
  })
  const searched = (written ? `/search?${written}` : '/search') as Route

  const drafted = (): RuleDraft | undefined => {
    if (!withinRuleName(entry.name)) {
      setProblem({
        field: 'name',
        text: `ルール名は 1 〜 ${RULE_NAME_LONGEST} 文字です。`,
      })

      return undefined
    }

    const narrowed = termsProblemOf(asked)

    if (narrowed) {
      setProblem(narrowed)

      return undefined
    }

    const priority = wholeNumber(entry.priority)

    if (priority === undefined || !withinPriority(priority)) {
      setProblem({
        field: 'priority',
        text: `優先度は ${PRIORITY_RANGE.least} 〜 ${PRIORITY_RANGE.most} の半角数字です。`,
      })

      return undefined
    }

    const margins: ['before' | 'after', string][] = [
      ['before', entry.before],
      ['after', entry.after],
    ]
    const read: Partial<Record<'before' | 'after', number>> = {}

    for (const [field, value] of margins) {
      const seconds = wholeNumber(value)

      if (seconds === undefined || !withinMargin(seconds)) {
        setProblem({
          field,
          text: `マージンは ${MARGIN_RANGE.least} 〜 ${MARGIN_RANGE.most} 秒の半角数字です。`,
        })

        return undefined
      }

      read[field] = seconds
    }

    setProblem(undefined)

    return {
      name: entry.name.trim(),
      terms: asked,
      priority,
      enabled: entry.enabled,
      marginBeforeSeconds: read.before!,
      marginAfterSeconds: read.after!,
      encodeWhenRecorded: entry.encodeWhenRecorded,
    }
  }

  const answered = <T,>(
    result: RuleWrite<T>,
    take: (data: T) => void,
  ): void => {
    if (result.state === 'ok') {
      setRefusal(undefined)
      take(result.data)

      return
    }

    setRefusal(result.state === 'unauthenticated' ? SIGNED_OUT : result.message)
  }

  const rehearse = useEffectEvent((opening: boolean): void => {
    if (opening && !ruleNarrowsAnything(asked)) {
      return
    }

    const narrowed = termsProblemOf(asked)

    if (narrowed) {
      setProblem(narrowed)

      return
    }

    setProblem((named) =>
      named?.field === 'terms' || named?.field === 'period' ? undefined : named,
    )

    const draft: RuleDraft = {
      name: entry.name.trim(),
      terms: asked,
      priority: numberWithin(
        entry.priority,
        withinPriority,
        RULE_DEFAULT_PRIORITY,
      ),
      enabled: entry.enabled,
      marginBeforeSeconds: numberWithin(entry.before, withinMargin, 0),
      marginAfterSeconds: numberWithin(entry.after, withinMargin, 0),
      encodeWhenRecorded: entry.encodeWhenRecorded,
    }
    const askedFor = conditions

    asks.current += 1

    const ask = asks.current

    startPreviewing(async () => {
      const result = await actions.onPreview(draft, rule?.id)

      if (ask !== asks.current) {
        return
      }

      answered(result, (seen) => {
        setPreview(seen)
        setShownFor(askedFor)
      })
    })
  })

  const lookedFor = useRef<string>(undefined)

  useEffect(() => {
    if (lookedFor.current === undefined) {
      lookedFor.current = conditions
      rehearse(true)

      return
    }

    if (lookedFor.current === conditions) {
      return
    }

    const timer = setTimeout(() => {
      lookedFor.current = conditions
      rehearse(false)
    }, MATCHES_SETTLE_MS)

    return () => clearTimeout(timer)
  }, [conditions])

  const weigh = (): void => {
    const draft = drafted()

    if (!draft) {
      return
    }

    setImpact(undefined)
    setConfirming(true)

    startTransition(async () => {
      const result = await actions.onImpact(draft, rule?.id)

      if (result.state === 'ok') {
        setRefusal(undefined)
        setImpact(result.data)

        return
      }

      setConfirming(false)
      setRefusal(
        result.state === 'unauthenticated' ? SIGNED_OUT : result.message,
      )
    })
  }

  const save = (): void => {
    const draft = drafted()

    if (!draft) {
      setConfirming(false)

      return
    }

    startTransition(async () => {
      const result = await actions.onSave(rule?.id, draft)

      if (result.state === 'ok') {
        setConfirming(false)
        setRefusal(undefined)

        if (!rule) {
          onOpen(result.data.id)
        }

        return
      }

      setConfirming(false)
      setRefusal(
        result.state === 'unauthenticated' ? SIGNED_OUT : result.message,
      )
    })
  }

  const retire = (): void => {
    if (!rule) {
      return
    }

    setLeaving(undefined)
    setRetiring(true)

    startTransition(async () => {
      const result = await actions.onImpact(draftOf(rule), rule.id)

      if (result.state === 'ok') {
        setRefusal(undefined)
        setLeaving(result.data)

        return
      }

      setRetiring(false)
      setRefusal(
        result.state === 'unauthenticated' ? SIGNED_OUT : result.message,
      )
    })
  }

  const remove = (): void => {
    if (!rule) {
      return
    }

    startTransition(async () => {
      const result = await actions.onDelete(rule.id)

      setRetiring(false)

      if (result.state === 'ok') {
        onClose()

        return
      }

      setRefusal(
        result.state === 'unauthenticated' ? SIGNED_OUT : result.message,
      )
    })
  }

  return (
    <section
      aria-label={rule ? rule.name : '新しいルール'}
      className="min-w-0 rounded-xl bg-surface px-6 pt-5 pb-6 phone:-mx-1 phone:px-4"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <h2 className="min-w-0 flex-1 text-section font-bold text-ink">
          {rule ? rule.name : '新しいルール'}
        </h2>
        <span className="flex items-center gap-2.5">
          <FieldLabel
            htmlFor="rule-enabled"
            className="text-ui font-medium text-ink-2"
          >
            有効
          </FieldLabel>
          <Switch
            id="rule-enabled"
            checked={entry.enabled}
            onCheckedChange={(next) => amend({ enabled: next })}
          />
        </span>
      </div>
      {rule && (
        <p className="mt-1 text-sub text-ink-2">
          作成 <span className="font-code">{formatMoment(rule.createdAt)}</span>
        </p>
      )}

      <div className="mt-5 flex flex-col gap-[calc(18rem/16)]">
        <Field>
          <RuleLabel htmlFor="rule-name">
            ルール名
            <RequiredMark />
          </RuleLabel>
          <Input
            id="rule-name"
            value={entry.name}
            aria-invalid={problem?.field === 'name' || undefined}
            aria-describedby={
              problem?.field === 'name' ? 'rule-name-error' : undefined
            }
            onChange={(event) => amend({ name: event.target.value })}
            className={ON_THE_PANEL}
          />
          <span aria-live="polite">
            {problem?.field === 'name' && (
              <FieldError id="rule-name-error">{problem.text}</FieldError>
            )}
          </span>
        </Field>

        <div className={TWO_UP}>
          <Field>
            <RuleLabel htmlFor="rule-keyword">キーワード</RuleLabel>
            <Input
              id="rule-keyword"
              value={entry.q}
              onChange={(event) => amend({ q: event.target.value })}
              className={ON_THE_PANEL}
            />
          </Field>

          <Field>
            <RuleLabel htmlFor="rule-exclude">除外キーワード</RuleLabel>
            <Input
              id="rule-exclude"
              value={entry.exclude}
              onChange={(event) => amend({ exclude: event.target.value })}
              className={ON_THE_PANEL}
            />
          </Field>
        </div>

        <div className={TWO_UP}>
          <Field>
            <RuleLabel id="rule-fields-label">対象範囲</RuleLabel>
            <SegmentedControl
              aria-label="対象範囲"
              options={SEARCH_FIELD_OPTIONS}
              value={entry.fields}
              onValueChange={(value) => amend({ fields: value as SearchField })}
              className={SEGMENTS_ON_THE_PANEL}
            />
          </Field>

          <Field>
            <RuleLabel>種別</RuleLabel>
            <SegmentedControl
              aria-label="種別"
              options={[
                { value: EVERY_KIND, label: 'すべて' },
                ...SEARCH_KIND_OPTIONS,
              ]}
              value={entry.kind ?? EVERY_KIND}
              onValueChange={(value) =>
                amend({
                  kind:
                    value === EVERY_KIND ? undefined : (value as SearchKind),
                  channels: [],
                })
              }
              className={SEGMENTS_ON_THE_PANEL}
            />
          </Field>
        </div>

        <div className={TWO_UP}>
          <Field>
            <RuleLabel>ジャンル</RuleLabel>
            <Tags>
              {entry.genres.map((genre) => (
                <RuleTag
                  key={genre}
                  label={genreLabelOf(genre)}
                  dot={DOT_OF[genre]}
                  spoken={`ジャンル ${genreLabelOf(genre)} を外す`}
                  onRemove={() =>
                    amend({
                      genres: entry.genres.filter((one) => one !== genre),
                    })
                  }
                />
              ))}
              {unusedGenres.length > 0 && (
                <AddPick
                  label="ジャンルを追加"
                  onPick={(value) =>
                    amend({ genres: [...entry.genres, value as SearchGenre] })
                  }
                >
                  {unusedGenres.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </AddPick>
              )}
            </Tags>
          </Field>

          <Field>
            <RuleLabel>サブジャンル</RuleLabel>
            <Tags>
              {entry.subgenres.map((subgenre) => (
                <RuleTag
                  key={subgenre}
                  label={subgenreLabelOf(subgenre)}
                  spoken={`サブジャンル ${subgenreLabelOf(subgenre)} を外す`}
                  onRemove={() =>
                    amend({
                      subgenres: entry.subgenres.filter(
                        (one) => one !== subgenre,
                      ),
                    })
                  }
                />
              ))}
              {offeredSubgenres(entry.genres, entry.subgenres).length > 0 && (
                <AddPick
                  label="サブジャンルを追加"
                  onPick={(value) =>
                    amend({ subgenres: [...entry.subgenres, value] })
                  }
                >
                  {offeredSubgenres(entry.genres, entry.subgenres).map(
                    (group) => (
                      <SelectGroup key={group.kind}>
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.under.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ),
                  )}
                </AddPick>
              )}
            </Tags>
          </Field>
        </div>

        <div className={TWO_UP}>
          <Field>
            <RuleLabel>チャンネル</RuleLabel>
            <Tags>
              {entry.channels.map((id) => (
                <RuleTag
                  key={id}
                  label={channelNameOf(id)}
                  spoken={`チャンネル ${channelNameOf(id)} を外す`}
                  onRemove={() =>
                    amend({
                      channels: entry.channels.filter((one) => one !== id),
                    })
                  }
                />
              ))}
              {unusedChannels.length > 0 &&
                entry.channels.length < SEARCH_MOST_CHANNELS && (
                  <AddPick
                    label="チャンネルを追加"
                    onPick={(value) =>
                      amend({ channels: [...entry.channels, value] })
                    }
                  >
                    {unusedChannels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.name}
                      </SelectItem>
                    ))}
                  </AddPick>
                )}
            </Tags>
            {entry.channels.length >= SEARCH_MOST_CHANNELS && (
              <FieldHint>
                チャンネルは {SEARCH_MOST_CHANNELS} 局まで指定できます
              </FieldHint>
            )}
          </Field>

          <Field>
            <RuleLabel id="rule-days-label">曜日</RuleLabel>
            <div
              role="group"
              aria-labelledby="rule-days-label"
              className="flex flex-wrap items-center gap-2"
            >
              {SEARCH_DAY_OPTIONS.map((day) => {
                const on = entry.days.includes(day.value)

                return (
                  <button
                    key={day.value}
                    type="button"
                    aria-pressed={on}
                    aria-label={day.label}
                    onClick={() =>
                      amend({
                        days: on
                          ? entry.days.filter((one) => one !== day.value)
                          : searchDaysInOrder([...entry.days, day.value]),
                      })
                    }
                    className={cn(
                      'tap-target grid size-9 cursor-pointer place-items-center rounded-sm text-ui font-semibold outline-none',
                      'transition-[background-color,color] duration-[140ms] ease-toy focus-visible:shadow-ring active:scale-[0.98]',
                      on
                        ? 'bg-accent-tint text-acc-text'
                        : 'bg-bg text-ink hover:bg-surface-2',
                    )}
                  >
                    {day.short}
                  </button>
                )
              })}
              <span className="ml-1 flex items-center gap-1.5">
                <Button
                  variant="tone"
                  size="sm"
                  aria-label="曜日を全選択"
                  disabled={everyDay}
                  onClick={() => amend({ days: EVERY_DAY })}
                >
                  全選択
                </Button>
                <Button
                  variant="tone"
                  size="sm"
                  aria-label="曜日の選択を解除"
                  disabled={entry.days.length === 0}
                  onClick={() => amend({ days: [] })}
                >
                  解除
                </Button>
              </span>
            </div>
          </Field>
        </div>

        <div className={TWO_UP}>
          <MarkField
            label="印"
            marks={entry.marks}
            offered={unnamedMarks}
            onChange={(marks) => amend({ marks })}
          />

          <MarkField
            label="除外する印"
            marks={entry.excludedMarks}
            offered={unnamedMarks}
            onChange={(excludedMarks) => amend({ excludedMarks })}
          />
        </div>

        <Field>
          <RuleLabel>期間</RuleLabel>
          <span className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              aria-label="期間の開始日"
              value={entry.from ?? ''}
              aria-invalid={problem?.field === 'period' || undefined}
              aria-describedby={
                problem?.field === 'period' ? 'rule-period-error' : undefined
              }
              onChange={(event) =>
                amend({ from: event.target.value || undefined })
              }
              areaClassName="w-[calc(160rem/16)]"
              className={ON_THE_PANEL}
            />
            <span className="text-sub text-ink-2">〜</span>
            <Input
              type="date"
              aria-label="期間の終了日"
              value={entry.to ?? ''}
              aria-invalid={problem?.field === 'period' || undefined}
              aria-describedby={
                problem?.field === 'period' ? 'rule-period-error' : undefined
              }
              onChange={(event) =>
                amend({ to: event.target.value || undefined })
              }
              areaClassName="w-[calc(160rem/16)]"
              className={ON_THE_PANEL}
            />
          </span>
          <span aria-live="polite">
            {problem?.field === 'period' && (
              <FieldError id="rule-period-error">{problem.text}</FieldError>
            )}
          </span>
        </Field>

        <span aria-live="polite" className="empty:hidden">
          {problem?.field === 'terms' && (
            <FieldError id="rule-terms-error">{problem.text}</FieldError>
          )}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-start gap-x-[calc(22rem/16)] gap-y-4 border-t border-hair pt-5">
        <RuleNumber
          field="priority"
          id="rule-priority"
          label="優先度"
          value={entry.priority}
          onChange={(priority) => amend({ priority })}
          range={PRIORITY_RANGE}
          step={1}
          problem={problem}
        />
        <RuleNumber
          field="before"
          id="rule-margin-before"
          label="前マージン(秒)"
          value={entry.before}
          onChange={(before) => amend({ before })}
          range={MARGIN_RANGE}
          step={10}
          problem={problem}
        />
        <RuleNumber
          field="after"
          id="rule-margin-after"
          label="後マージン(秒)"
          value={entry.after}
          onChange={(after) => amend({ after })}
          range={MARGIN_RANGE}
          step={10}
          problem={problem}
        />
        <div className="flex h-9 items-center gap-2.5 self-end">
          <Switch
            id="rule-encode"
            checked={entry.encodeWhenRecorded}
            onCheckedChange={(next) => amend({ encodeWhenRecorded: next })}
          />
          <FieldLabel htmlFor="rule-encode" className="text-ui font-semibold">
            自動エンコード
          </FieldLabel>
        </div>
      </div>

      <section
        aria-labelledby="rule-matches"
        className="mt-6 border-t border-hair pt-5"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 id="rule-matches" className="text-ui font-semibold text-ink">
            {preview ? (
              <>
                この条件に一致する今後の番組{' '}
                <span className="font-code">{preview.matched}</span> 件
              </>
            ) : (
              'この条件に一致する今後の番組'
            )}
          </h3>
          <Button variant="tone" size="sm" asChild className="ml-auto">
            <Link href={searched}>番組検索へ</Link>
          </Button>
        </div>

        {preview && (
          <div className={cn('mt-2 flex flex-col gap-3', stale && 'grayscale')}>
            <span
              className={cn(
                'block text-sub text-ink-2',
                stale && '[&_b]:text-ink-2',
              )}
            >
              一致 <Count value={preview.matched} /> 件 / 新しく作られる{' '}
              <Count value={preview.making} /> 件 / 予約済み{' '}
              <Count value={preview.alreadyReserved} /> 件 / 競合{' '}
              <Count value={preview.contended} /> 件
            </span>
            <Excluded excluded={preview.excluded} as="p" />
            {preview.takes.length === 0 ? (
              <EmptyState usher={null} title="条件に合う番組がありません" />
            ) : (
              <>
                <ul className="flex flex-col">
                  {preview.takes.map((take) => (
                    <li
                      key={take.id}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-5 gap-y-0.5 border-b border-hair py-2.5 last:border-b-0 max-[700px]:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <span className="font-code text-ui whitespace-nowrap text-ink-2 max-[700px]:col-span-2">
                        {take.whenLabel}
                      </span>
                      <span className="min-w-0 text-ui font-semibold text-ink">
                        {take.title}
                      </span>
                      <span className="flex items-center justify-end gap-2.5">
                        <span className="text-ui whitespace-nowrap text-ink-2">
                          {take.channelName}
                        </span>
                        {take.alreadyReserved ? (
                          <Badge variant="mute">予約済み</Badge>
                        ) : take.verdict === 'contended' ? (
                          <Badge variant="err">競合</Badge>
                        ) : (
                          <Badge variant="ok">確保</Badge>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                {preview.matched > preview.takes.length && (
                  <p className="text-note text-ink-2">
                    先の <Count value={RULE_TAKES_SHOWN} />{' '}
                    件だけを載せています。
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <Button disabled={pending} onClick={weigh}>
          保存
        </Button>
        {rule && (
          <Button variant="danger" disabled={pending} onClick={retire}>
            <TrashIcon />
            削除
          </Button>
        )}
        <Button
          variant="tone"
          disabled={pending}
          onClick={onClose}
          className="ml-auto"
        >
          閉じる
        </Button>
      </div>

      <span aria-live="polite">
        {refusal && (
          <InlineAlert tone="warn" className="mt-2.5">
            {refusal}
          </InlineAlert>
        )}
      </span>

      {rule && (
        <AlertDialog open={retiring} onOpenChange={setRetiring}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>このルールを削除します</AlertDialogTitle>
              <AlertDialogDescription>{rule.name}</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-1.5 text-ui text-ink-2">
              {leaving ? (
                <span>
                  引っ込む予約 <Count value={leaving.sweeping} /> 件
                </span>
              ) : (
                <span className="text-ink-2">件数を数えています。</span>
              )}
            </div>
            <p className="flex items-center gap-2 rounded-md bg-rec-soft px-3.5 py-2.5 text-ui font-medium text-rec-text">
              <WarningIcon className="size-4 shrink-0" />
              削除したルールは元に戻せません。
            </p>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                variant="danger"
                disabled={pending || !leaving}
                onClick={(event) => {
                  event.preventDefault()
                  remove()
                }}
              >
                <TrashIcon />
                削除する
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent
          aria-describedby={undefined}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>このルールを保存します</DialogTitle>
            {!impact && (
              <DialogDescription>件数を数えています。</DialogDescription>
            )}
          </DialogHeader>

          {impact && (
            <div className="flex flex-col gap-1.5 text-ui text-ink-2">
              <span>
                新しく作られる予約 <Count value={impact.making} /> 件
              </span>
              <span>
                引っ込む予約 <Count value={impact.withdrawing} /> 件
              </span>
              <span>
                このルールに付け替わる予約{' '}
                <Count value={impact.changingHands} /> 件
              </span>
              <Excluded excluded={impact.excluded} as="span" />
            </div>
          )}

          <DialogFooter>
            <Button variant="tone" onClick={() => setConfirming(false)}>
              キャンセル
            </Button>
            <Button disabled={pending || !impact} onClick={save}>
              保存する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

const ON_THE_PANEL = 'rounded-md bg-bg enabled:hover:bg-bg focus-visible:bg-bg'

const TWO_UP = 'grid gap-x-5 gap-y-[calc(18rem/16)] min-[800px]:grid-cols-2'

const SEGMENTS_ON_THE_PANEL = 'w-fit bg-bg'

/** The dot each genre wears in the guide, by the name a search gives the genre. */
const DOT_OF: Partial<Record<SearchGenre, Genre>> = {
  news: 'news',
  sports: 'sports',
  info: 'info',
  drama: 'drama',
  music: 'music',
  variety: 'variety',
  movie: 'movie',
  anime: 'anime',
  documentary: 'doc',
}

function RuleLabel({ className, ...props }: ComponentProps<typeof FieldLabel>) {
  return (
    <FieldLabel
      className={cn('text-sub font-semibold text-ink-2', className)}
      {...props}
    />
  )
}

/** The field a set of picks sits in: the picks as tags, and the way to add one more at their end. */
function Tags({ children }: { children: ReactNode }) {
  return (
    <span className="flex min-h-10 flex-wrap items-center gap-x-2 gap-y-4 rounded-md bg-bg px-1.5 py-1.5">
      {children}
    </span>
  )
}

function RuleTag({
  label,
  spoken,
  dot,
  onRemove,
}: {
  label: string
  spoken: string
  dot?: Genre
  onRemove: () => void
}) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-sm bg-raised pr-1.5 pl-2.5 text-ui font-medium text-ink shadow-[0_0_0_1px_var(--hair)]">
      <GenreDot genre={dot} />
      {label}
      <button
        type="button"
        aria-label={spoken}
        onClick={onRemove}
        className="tap-target grid size-5 shrink-0 cursor-pointer place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink [&_svg]:size-3"
      >
        <CloseIcon />
      </button>
    </span>
  )
}

function AddPick({
  label,
  onPick,
  children,
}: {
  label: string
  onPick: (value: string) => void
  children: ReactNode
}) {
  return (
    <Select value="" onValueChange={onPick}>
      <SelectTrigger
        size="sm"
        aria-label={label}
        className="h-7 w-fit gap-1 rounded-full bg-surface-2 px-2.5 text-ui font-medium text-ink enabled:hover:bg-surface-3 [&>svg:last-child]:hidden"
      >
        <PlusIcon className="size-3.5" />
        {label}
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  )
}

function RuleNumber({
  field,
  id,
  label,
  value,
  onChange,
  range,
  step,
  problem,
}: {
  field: Named['field']
  id: string
  label: string
  value: string
  onChange: (next: string) => void
  range: { least: number; most: number }
  step: number
  problem?: Named
}) {
  const wrong = problem?.field === field

  return (
    <Field className="gap-2">
      <RuleLabel htmlFor={id}>
        {label}
        <RequiredMark />
      </RuleLabel>
      <Stepper
        id={id}
        value={value}
        onChange={onChange}
        range={range}
        step={step}
        invalid={wrong}
        describedBy={wrong ? `${id}-error` : undefined}
        className="bg-bg"
      />
      <span aria-live="polite">
        {wrong && <FieldError id={`${id}-error`}>{problem.text}</FieldError>}
      </span>
    </Field>
  )
}

function MarkField({
  label,
  marks,
  offered,
  onChange,
}: {
  label: string
  marks: RuleMark[]
  offered: { value: RuleMark; label: string }[]
  onChange: (marks: RuleMark[]) => void
}) {
  return (
    <Field>
      <RuleLabel>{label}</RuleLabel>
      <Tags>
        {marks.map((mark) => (
          <RuleTag
            key={mark}
            label={ruleMarkLabelOf(mark)}
            spoken={`${label} ${ruleMarkLabelOf(mark)} を外す`}
            onRemove={() => onChange(marks.filter((one) => one !== mark))}
          />
        ))}
        {offered.length > 0 && (
          <AddPick
            label={`${label}を追加`}
            onPick={(value) =>
              onChange(ruleMarksInOrder([...marks, value as RuleMark]))
            }
          >
            {offered.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </AddPick>
        )}
      </Tags>
    </Field>
  )
}
