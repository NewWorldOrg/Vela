'use client'

import type { ReactNode } from 'react'
import { useCallback, useState, useTransition } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { formatDateTime } from '@/lib/format'
import {
  MARGIN_RANGE,
  PRIORITY_RANGE,
  wholeNumber,
  withinMargin,
  withinPriority,
} from '@/lib/reservations'
import {
  NEW_RULE,
  RULE_DEFAULT_PRIORITY,
  RULE_NAME_LONGEST,
  RULE_PARAM,
  RULE_TAKES_SHOWN,
  ruleConditionParts,
  ruleNarrowsAnything,
  withinRuleName,
} from '@/lib/rules'
import { cn } from '@/lib/utils'
import type { GuideChannel } from '@/repository/programs'
import type {
  Rule,
  RuleDraft,
  RuleImpact,
  RulePreview,
  RuleRetirement,
  RulesResult,
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
  searchTermsQueryOf,
} from '@/repository/search-options'
import type {
  SearchField,
  SearchGenre,
  SearchKind,
  SearchTerms,
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
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Banner, InlineAlert } from '@/components/vela/banner'
import { EmptyState } from '@/components/vela/empty-state'
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
} from '@/components/vela/field'
import {
  CloseIcon,
  FilterIcon,
  ListIcon,
  PlusIcon,
  ReservationIcon,
  SearchIcon,
  SettingsIcon,
  TrashIcon,
  WarningIcon,
} from '@/components/vela/icons'
import { ReservationTabs } from '@/components/reservations/reservation-tabs'

/** What the address asks the editor to hold. */
export type RuleEditing =
  | { state: 'none' }
  | { state: 'new'; terms: SearchTerms }
  | { state: 'rule'; rule: Rule }

export interface RuleActions {
  onSave: (id: string | undefined, draft: RuleDraft) => Promise<RuleWrite<Rule>>
  onDelete: (id: string) => Promise<RuleWrite<RuleRetirement>>
  onSwitch: (id: string, enabled: boolean) => Promise<RuleWrite<number>>
  onPreview: (draft: RuleDraft, id?: string) => Promise<RuleWrite<RulePreview>>
  onImpact: (draft: RuleDraft, id?: string) => Promise<RuleWrite<RuleImpact>>
}

const EVERY_KIND = 'all'

const SIGNED_OUT =
  'サインインが切れているため、操作できませんでした。サインインしてから開き直してください。'

const FOLLOWS_LATER =
  '保存した条件は再計算のあとに予約へ反映されます。一覧にすぐ現れないことがあります。'

interface Named {
  field: 'name' | 'terms' | 'priority' | 'before' | 'after'
  text: string
}

/**
 * The screen, begun again from nothing whenever the address opens a different
 * rule. That is how the fields come to hold what the address asks for without
 * a `useEffect` watching it, and why moving to another rule leaves nothing of
 * the entry that was being written for the last one.
 */
export function RulesView({
  result,
  channels,
  editing,
  actions,
}: {
  result: RulesResult
  channels: GuideChannel[]
  editing: RuleEditing
  actions: RuleActions
}) {
  return (
    <RulesScreen
      key={keyOf(editing)}
      result={result}
      channels={channels}
      editing={editing}
      actions={actions}
    />
  )
}

function keyOf(editing: RuleEditing): string {
  if (editing.state === 'rule') {
    // Whether the rule is switched on is answered in the list as well as in
    // the editor, so it is part of what the editor is begun from: a rule
    // switched off from the list while its editor stood open would otherwise
    // be switched back on by the next save.
    return `${editing.rule.id}:${editing.rule.enabled}`
  }

  return editing.state === 'new'
    ? `${NEW_RULE}?${searchTermsQueryOf(editing.terms)}`
    : 'none'
}

function RulesScreen({
  result,
  channels,
  editing,
  actions,
}: {
  result: RulesResult
  channels: GuideChannel[]
  editing: RuleEditing
  actions: RuleActions
}) {
  const router = useRouter()
  const pathname = usePathname()
  const open = useCallback(
    (rule: string | undefined) => {
      const href = rule ? `${pathname}?${RULE_PARAM}=${rule}` : pathname

      router.replace(href as Route, { scroll: false })
    },
    [router, pathname],
  )
  const enabled = result.items.filter((rule) => rule.enabled).length
  const channelNameOf = (id: string): string =>
    channels.find((channel) => channel.id === id)?.name || id

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-3.5 pt-6 pb-16 min-[701px]:px-5 min-[1061px]:px-[30px]">
      <ReservationTabs
        current="rules"
        action={
          <Button size="sm" asChild>
            <Link href="/search">
              <SearchIcon />
              検索から作る
            </Link>
          </Button>
        }
      />

      <Banner tone="info" className="mb-3.5">
        <b className="block font-bold">
          ルールは番組検索と同じ条件で書きます。
        </b>
        <span className="block">
          保存する前に、条件に一致する番組と、いまの予約がどう変わるかを確認できます。
          {FOLLOWS_LATER}
        </span>
      </Banner>

      <div className="grid items-start gap-3.5 min-[1061px]:grid-cols-[minmax(280px,360px)_1fr]">
        <section className="rounded-lg bg-surface px-4 py-3.5">
          <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
            <h2 className="heading flex items-center gap-1.5 text-[15px]">
              <ReservationIcon className="size-4 text-brand" />
              ルール
            </h2>
            <span className="ml-auto text-sub text-ink-2">
              全{' '}
              <b className="font-code font-medium text-ink">{result.total}</b>{' '}
              件 · 有効{' '}
              <b className="font-code font-medium text-ink">{enabled}</b>
            </span>
          </div>

          {result.items.length === 0 ? (
            <p className="py-4 text-center text-sub text-ink-3">
              まだルールがありません。
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {result.items.map((rule) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  selected={
                    editing.state === 'rule' && editing.rule.id === rule.id
                  }
                  summary={ruleConditionParts(rule.terms, channelNameOf).join(
                    ' · ',
                  )}
                  onOpen={() => open(rule.id)}
                  onSwitch={(next) => actions.onSwitch(rule.id, next)}
                />
              ))}
            </ul>
          )}

          <div className="mt-2.5 flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => open(NEW_RULE)}>
              <PlusIcon />
              ルールを追加
            </Button>
          </div>
        </section>

        {editing.state === 'none' ? (
          <EmptyState
            spot="antenna"
            title="ルールが選ばれていません"
            className="min-[1061px]:mt-6"
          >
            左の一覧からルールを選ぶか、「ルールを追加」を押すと、ここで条件を書けます。
          </EmptyState>
        ) : (
          <RuleEditor
            rule={editing.state === 'rule' ? editing.rule : undefined}
            terms={
              editing.state === 'rule' ? editing.rule.terms : editing.terms
            }
            channels={channels}
            actions={actions}
            onOpen={open}
            onClose={() => open(undefined)}
          />
        )}
      </div>
    </main>
  )
}

function RuleRow({
  rule,
  selected,
  summary,
  onOpen,
  onSwitch,
}: {
  rule: Rule
  selected: boolean
  summary: string
  onOpen: () => void
  onSwitch: (enabled: boolean) => Promise<RuleWrite<number>>
}) {
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()

  return (
    <li>
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-[background-color] duration-150',
          selected ? 'bg-brand-soft' : 'hover:bg-surface-2',
        )}
      >
        <button
          type="button"
          onClick={onOpen}
          aria-current={selected ? 'true' : undefined}
          className="tap-target min-w-0 flex-1 cursor-pointer text-left"
        >
          <b
            className={cn(
              'block truncate text-ui font-bold',
              rule.enabled ? 'text-ink' : 'text-ink-3',
            )}
          >
            {rule.name}
          </b>
          <span className="block truncate text-note text-ink-3">{summary}</span>
        </button>
        <Switch
          size="sm"
          checked={rule.enabled}
          disabled={pending}
          aria-label={`${rule.name} を有効にする`}
          onCheckedChange={(next) =>
            startTransition(async () => {
              const result = await onSwitch(next)

              setRefusal(
                result.state === 'ok'
                  ? undefined
                  : result.state === 'unauthenticated'
                    ? SIGNED_OUT
                    : result.message,
              )
            })
          }
        />
      </div>
      <span aria-live="polite">
        {refusal && (
          <InlineAlert tone="warn" className="mt-1.5">
            {refusal}
          </InlineAlert>
        )}
      </span>
    </li>
  )
}

interface Entry {
  name: string
  q: string
  exclude: string
  fields: SearchField
  genres: SearchGenre[]
  kind?: SearchKind
  channels: string[]
  priority: string
  before: string
  after: string
  enabled: boolean
}

function entryOf(rule: Rule | undefined, terms: SearchTerms): Entry {
  return {
    name: rule?.name ?? '',
    q: terms.q ?? '',
    exclude: terms.exclude ?? '',
    fields: terms.fields,
    genres: terms.genres,
    kind: terms.kind,
    channels: terms.channels,
    priority: String(rule?.priority ?? RULE_DEFAULT_PRIORITY),
    before: String(rule?.marginBeforeSeconds ?? 0),
    after: String(rule?.marginAfterSeconds ?? 0),
    enabled: rule?.enabled ?? true,
  }
}

function termsOfEntry(entry: Entry): SearchTerms {
  return {
    q: entry.q.trim() || undefined,
    exclude: entry.exclude.trim() || undefined,
    fields: entry.fields,
    genres: entry.genres,
    kind: entry.kind,
    channels: entry.channels,
  }
}

/** The rule as it stands, spelled as a draft so it can be weighed again. */
function draftOf(rule: Rule): RuleDraft {
  return {
    name: rule.name,
    terms: rule.terms,
    priority: rule.priority,
    enabled: rule.enabled,
    marginBeforeSeconds: rule.marginBeforeSeconds,
    marginAfterSeconds: rule.marginAfterSeconds,
  }
}

function RuleEditor({
  rule,
  terms,
  channels,
  actions,
  onOpen,
  onClose,
}: {
  rule?: Rule
  terms: SearchTerms
  channels: GuideChannel[]
  actions: RuleActions
  onOpen: (id: string) => void
  onClose: () => void
}) {
  const [entry, setEntry] = useState<Entry>(() => entryOf(rule, terms))
  const [problem, setProblem] = useState<Named>()
  const [refusal, setRefusal] = useState<string>()
  const [preview, setPreview] = useState<RulePreview>()
  const [impact, setImpact] = useState<RuleImpact>()
  const [leaving, setLeaving] = useState<RuleImpact>()
  const [confirming, setConfirming] = useState(false)
  const [retiring, setRetiring] = useState(false)
  const [pending, startTransition] = useTransition()

  const amend = (part: Partial<Entry>): void => {
    setEntry((previous) => ({ ...previous, ...part }))
    setPreview(undefined)
  }

  const asked: SearchTerms = termsOfEntry(entry)
  const unusedGenres = SEARCH_GENRE_OPTIONS.filter(
    (option) => !entry.genres.includes(option.value),
  )
  const unusedChannels = channels.filter(
    (channel) =>
      (!entry.kind || channel.kind === entry.kind) &&
      !entry.channels.includes(channel.id),
  )
  const channelNameOf = (id: string): string =>
    channels.find((channel) => channel.id === id)?.name || id
  /**
   * The same conditions on the search screen, arranged the way that screen
   * arranges them when nobody has said otherwise.
   */
  const written = searchQueryOf({
    ...asked,
    sort: SEARCH_DEFAULT_SORT,
    perPage: SEARCH_DEFAULT_PER_PAGE,
    page: 1,
  })
  const searched = (written ? `/search?${written}` : '/search') as Route

  /** The draft the fields hold, or the reason it cannot be one. */
  const drafted = (): RuleDraft | undefined => {
    if (!withinRuleName(entry.name)) {
      setProblem({
        field: 'name',
        text: `ルール名は 1 〜 ${RULE_NAME_LONGEST} 文字です。`,
      })

      return undefined
    }

    if (!ruleNarrowsAnything(asked)) {
      setProblem({
        field: 'terms',
        text: 'キーワード・除外キーワード・ジャンル・種別・チャンネルのうち、1 つ以上を指定してください。',
      })

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

  const rehearse = (): void => {
    const draft = drafted()

    if (!draft) {
      return
    }

    startTransition(async () => {
      answered(await actions.onPreview(draft, rule?.id), setPreview)
    })
  }

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

      // Nothing was counted, so there is nothing to confirm: the question
      // closes and the reason stands under the form where the fields are.
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

        // A rule that has just been written has an address of its own, and
        // the editor stands on it: pressing 保存 again is then the same rule
        // saved again rather than a second one written from the same fields.
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

  /**
   * What deleting would leave, counted from the rule as it stands rather than
   * from the fields, which may have been written into since it was opened.
   * The count reaches the question before the question can be answered, so
   * pressing through it cannot report a number nobody has.
   */
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
    <section className="rounded-lg bg-surface px-4 py-3.5">
      <div className="mb-3 flex flex-wrap items-center gap-2.5 border-b border-dashed border-line pb-2.5">
        <h2 className="heading min-w-0 flex-1 truncate text-[15px]">
          {rule ? rule.name : '新しいルール'}
        </h2>
        {entry.enabled ? (
          <Badge variant="ok" className="font-bold">
            有効
          </Badge>
        ) : (
          <Badge variant="mute">無効</Badge>
        )}
        {rule && (
          <span className="text-note text-ink-3">
            作成 {formatDateTime(rule.createdAt)}
          </span>
        )}
      </div>

      <FormSection
        icon={<FilterIcon className="size-4 text-brand" />}
        title="条件"
      >
        <Field>
          <FieldLabel htmlFor="rule-name">ルール名</FieldLabel>
          <Input
            id="rule-name"
            value={entry.name}
            aria-invalid={problem?.field === 'name' || undefined}
            aria-describedby={
              problem?.field === 'name' ? 'rule-name-error' : undefined
            }
            onChange={(event) => amend({ name: event.target.value })}
          />
          <FieldHint>一覧でこのルールを探すための名前です</FieldHint>
          <span aria-live="polite">
            {problem?.field === 'name' && (
              <FieldError id="rule-name-error">{problem.text}</FieldError>
            )}
          </span>
        </Field>

        <div className="grid gap-3.5 min-[701px]:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="rule-keyword">キーワード</FieldLabel>
            <Input
              id="rule-keyword"
              value={entry.q}
              onChange={(event) => amend({ q: event.target.value })}
            />
            <FieldHint>空白で区切ると、すべてを含む番組が対象です</FieldHint>
          </Field>

          <Field>
            <FieldLabel htmlFor="rule-exclude">除外キーワード</FieldLabel>
            <Input
              id="rule-exclude"
              value={entry.exclude}
              onChange={(event) => amend({ exclude: event.target.value })}
            />
            <FieldHint>この語を含む番組は対象から外れます</FieldHint>
          </Field>
        </div>

        <div className="grid gap-3.5 min-[701px]:grid-cols-2">
          <Field>
            <FieldLabel>対象フィールド</FieldLabel>
            <Select
              value={entry.fields}
              onValueChange={(value) => amend({ fields: value as SearchField })}
            >
              <SelectTrigger
                size="sm"
                aria-label="対象フィールド"
                className="w-fit rounded-full"
              >
                {
                  SEARCH_FIELD_OPTIONS.find(
                    (option) => option.value === entry.fields,
                  )?.label
                }
              </SelectTrigger>
              <SelectContent position="popper">
                {SEARCH_FIELD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldHint>キーワードと除外キーワードを探す場所です</FieldHint>
          </Field>

          <Field>
            <FieldLabel>種別</FieldLabel>
            <Select
              value={entry.kind ?? EVERY_KIND}
              onValueChange={(value) =>
                amend({
                  kind:
                    value === EVERY_KIND ? undefined : (value as SearchKind),
                  channels: [],
                })
              }
            >
              <SelectTrigger
                size="sm"
                aria-label="種別"
                className="w-fit rounded-full"
              >
                {SEARCH_KIND_OPTIONS.find(
                  (option) => option.value === entry.kind,
                )?.label ?? 'すべて'}
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value={EVERY_KIND}>すべて</SelectItem>
                {SEARCH_KIND_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field>
          <FieldLabel>ジャンル</FieldLabel>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-[18px]">
            {entry.genres.map((genre) => (
              <Pick
                key={genre}
                label={genreLabelOf(genre)}
                spoken={`ジャンル ${genreLabelOf(genre)} を外す`}
                onRemove={() =>
                  amend({
                    genres: entry.genres.filter((one) => one !== genre),
                  })
                }
              />
            ))}
            {unusedGenres.length > 0 && (
              <Select
                value=""
                onValueChange={(value) =>
                  amend({ genres: [...entry.genres, value as SearchGenre] })
                }
              >
                <SelectTrigger
                  size="sm"
                  aria-label="ジャンルを足す"
                  className="w-fit rounded-full text-ink-3"
                >
                  ＋ ジャンルを足す
                </SelectTrigger>
                <SelectContent position="popper">
                  {unusedGenres.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </span>
          <FieldHint>
            複数指定したときは、どれかに当たる番組が対象です
          </FieldHint>
        </Field>

        <Field>
          <FieldLabel>対象チャンネル</FieldLabel>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-[18px]">
            {entry.channels.map((id) => (
              <Pick
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
                <Select
                  value=""
                  onValueChange={(value) =>
                    amend({ channels: [...entry.channels, value] })
                  }
                >
                  <SelectTrigger
                    size="sm"
                    aria-label="チャンネルを足す"
                    className="w-fit rounded-full text-ink-3"
                  >
                    ＋ チャンネルを足す
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {unusedChannels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
          </span>
          <FieldHint>
            {entry.channels.length === 0
              ? '未選択のときは、すべてのチャンネルが対象です'
              : `チャンネルは ${SEARCH_MOST_CHANNELS} 局まで指定できます`}
          </FieldHint>
        </Field>

        <span aria-live="polite">
          {problem?.field === 'terms' && (
            <FieldError id="rule-terms-error">{problem.text}</FieldError>
          )}
        </span>
      </FormSection>

      <FormSection
        icon={<SettingsIcon className="size-4 text-brand" />}
        title="録画設定"
      >
        <div className="grid gap-3.5 min-[701px]:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="rule-priority">優先度</FieldLabel>
            <Input
              id="rule-priority"
              inputMode="numeric"
              value={entry.priority}
              aria-invalid={problem?.field === 'priority' || undefined}
              aria-describedby={
                problem?.field === 'priority'
                  ? 'rule-priority-error'
                  : undefined
              }
              onChange={(event) => amend({ priority: event.target.value })}
            />
            <FieldHint>
              数が大きいほど先にチューナーを取ります({PRIORITY_RANGE.least} 〜{' '}
              {PRIORITY_RANGE.most})
            </FieldHint>
            <span aria-live="polite">
              {problem?.field === 'priority' && (
                <FieldError id="rule-priority-error">{problem.text}</FieldError>
              )}
            </span>
          </Field>

          <Field>
            <FieldLabel htmlFor="rule-margin-before">前マージン(秒)</FieldLabel>
            <Input
              id="rule-margin-before"
              inputMode="numeric"
              value={entry.before}
              aria-invalid={problem?.field === 'before' || undefined}
              aria-describedby={
                problem?.field === 'before'
                  ? 'rule-margin-before-error'
                  : undefined
              }
              onChange={(event) => amend({ before: event.target.value })}
            />
            <FieldHint>
              放送開始の何秒前から録画を始めるか(0 〜 {MARGIN_RANGE.most})
            </FieldHint>
            <span aria-live="polite">
              {problem?.field === 'before' && (
                <FieldError id="rule-margin-before-error">
                  {problem.text}
                </FieldError>
              )}
            </span>
          </Field>

          <Field>
            <FieldLabel htmlFor="rule-margin-after">後マージン(秒)</FieldLabel>
            <Input
              id="rule-margin-after"
              inputMode="numeric"
              value={entry.after}
              aria-invalid={problem?.field === 'after' || undefined}
              aria-describedby={
                problem?.field === 'after'
                  ? 'rule-margin-after-error'
                  : undefined
              }
              onChange={(event) => amend({ after: event.target.value })}
            />
            <FieldHint>
              放送終了の何秒後まで録画を続けるか(0 〜 {MARGIN_RANGE.most})
            </FieldHint>
            <span aria-live="polite">
              {problem?.field === 'after' && (
                <FieldError id="rule-margin-after-error">
                  {problem.text}
                </FieldError>
              )}
            </span>
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Switch
            id="rule-enabled"
            checked={entry.enabled}
            onCheckedChange={(next) => amend({ enabled: next })}
          />
          <FieldLabel htmlFor="rule-enabled">有効</FieldLabel>
          <FieldHint>
            無効のルールからは予約が作られません。有効にした時点から対象になります。
          </FieldHint>
        </div>
      </FormSection>

      <FormSection
        icon={<ListIcon className="size-4 text-brand" />}
        title="マッチプレビュー"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={rehearse}
          >
            <SearchIcon />
            下見する
          </Button>
          {preview && (
            <span className="text-sub text-ink-2">
              一致 <Count value={preview.matched} /> 件 / 新しく作られる{' '}
              <Count value={preview.making} /> 件 / 予約済み{' '}
              <Count value={preview.alreadyReserved} /> 件 / 競合{' '}
              <Count value={preview.contended} /> 件
            </span>
          )}
          <Link
            href={searched}
            className="tap-target ml-auto text-note font-bold text-ink-2 underline underline-offset-[3px] hover:text-ink"
          >
            番組検索で見る
          </Link>
        </div>

        {preview && (
          <>
            {preview.excluded > 0 && (
              <p className="text-note text-ink-3">
                <Count value={preview.excluded} /> 件は除外されました。
              </p>
            )}
            {preview.takes.length === 0 ? (
              <p className="text-sub text-ink-3">
                いまの番組表に、この条件に一致する番組はありません。条件に合う番組が放送されたときに予約が作られます。
              </p>
            ) : (
              <>
                <ul className="flex flex-col">
                  {preview.takes.map((take) => (
                    <li
                      key={take.id}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-dashed border-line py-[7px] last:border-b-0"
                    >
                      <span className="font-code text-note whitespace-nowrap text-ink-2">
                        {take.whenLabel}
                      </span>
                      <span className="text-note whitespace-nowrap text-ink-3">
                        {take.channelName}
                      </span>
                      <span className="min-w-0 flex-1 text-ui text-ink">
                        {take.title}
                      </span>
                      {take.alreadyReserved ? (
                        <Badge variant="mute">予約済み</Badge>
                      ) : take.verdict === 'contended' ? (
                        <Badge variant="err">競合</Badge>
                      ) : (
                        <Badge variant="ok">確保</Badge>
                      )}
                    </li>
                  ))}
                </ul>
                {preview.matched > preview.takes.length && (
                  <p className="text-note text-ink-3">
                    先の <Count value={RULE_TAKES_SHOWN} />{' '}
                    件だけを載せています。
                  </p>
                )}
              </>
            )}
          </>
        )}
      </FormSection>

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5 border-t border-dashed border-line pt-3">
        {rule && (
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={retire}
          >
            <TrashIcon />
            削除
          </Button>
        )}
        <Button variant="ghost" size="sm" disabled={pending} onClick={onClose}>
          閉じる
        </Button>
        <Button className="ml-auto" disabled={pending} onClick={weigh}>
          保存
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
              <AlertDialogDescription>
                {rule.name}{' '}
                から作られた予約のうち、録画がまだ始まっておらず、取り消してもいないものが引っ込みます。録画が始まったものと、取り消したものは残ります。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-1.5 text-ui text-ink-2">
              {leaving ? (
                <span>
                  引っ込む予約 <Count value={leaving.sweeping} /> 件
                </span>
              ) : (
                <span className="text-ink-3">件数を数えています。</span>
              )}
              <span className="text-note leading-relaxed text-ink-3">
                削除では、番組表の収集が完了していない放送の予約と、開始が猶予以内に迫っている予約も引っ込みます。保存して再適用したときに引っ込む件数とは異なることがあります。
              </span>
            </div>
            <p className="flex items-center gap-2 rounded-md bg-coral-soft px-3.5 py-2.5 text-ui font-medium text-coral">
              <WarningIcon className="size-4 shrink-0" />
              削除したルールは元に戻せません。
            </p>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
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
        <DialogContent onInteractOutside={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>この保存で予約がどう変わるか</DialogTitle>
            <DialogDescription>
              {impact
                ? 'いまの番組表で数えた件数です。'
                : '件数を数えています。'}
            </DialogDescription>
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
              {impact.excluded > 0 && (
                <span className="text-note text-ink-3">
                  <Count value={impact.excluded} /> 件は除外されました。
                </span>
              )}
              <span className="text-note text-ink-3">{FOLLOWS_LATER}</span>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
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

function FormSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <section className="mb-3.5 flex flex-col gap-3.5 last:mb-0">
      <h3 className="heading flex items-center gap-1.5 text-ui">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  )
}

function Count({ value }: { value: number }) {
  return <b className="font-code font-medium text-ink">{value}</b>
}

/** One answer to a condition that takes several, spelled as on the search screen. */
function Pick({
  label,
  spoken,
  onRemove,
}: {
  label: string
  spoken: string
  onRemove: () => void
}) {
  return (
    <span className="inline-flex items-center gap-[7px] rounded-full border border-brand bg-brand-soft py-1 pr-1.5 pl-3 text-sub font-bold text-brand">
      {label}
      <button
        type="button"
        aria-label={spoken}
        onClick={onRemove}
        className="tap-target flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface text-brand [&_svg]:size-2.5"
      >
        <CloseIcon />
      </button>
    </span>
  )
}
