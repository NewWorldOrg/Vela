import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { StateTerm } from '@/lib/state-terms'

const WIDE_GLYPH = /[　-ヿ㐀-鿿豈-﫿＀-￯]/u

const WIDE_EM = 1

const NARROW_EM = 0.6

const SAY_FONT_PX = 12.5

const DOT_AND_GAP_PX = 12

const CELL_SIDES_PX = 26

const PILL_SIDES_PX = 22

const BASE_FONT_PX = 16

export type StateTone = 'ok' | 'warn' | 'err' | 'info' | 'mute'

const SAY_TONE: Record<StateTone, string> = {
  ok: 'text-mint',
  warn: 'text-lemon',
  err: 'text-coral',
  info: 'text-brand',
  mute: 'text-ink-3',
}

function emOf(word: string): number {
  return [...word].reduce(
    (sum, glyph) => sum + (WIDE_GLYPH.test(glyph) ? WIDE_EM : NARROW_EM),
    0,
  )
}

export function stateColumnFor(words: readonly string[]): string {
  const longest = Math.max(...words.map(emOf))
  const px = Math.ceil(longest * SAY_FONT_PX + DOT_AND_GAP_PX + CELL_SIDES_PX)

  return `calc(${px}rem / ${BASE_FONT_PX})`
}

/*
 * A column that only ever says one of two words is counted, not read. The dot
 * and the word of a state column leave nothing but ink darkness between them,
 * and 無効 cannot be picked out of forty rows that way, so this column keeps
 * the pill: two colours, one width, and the exceptions show up as a band.
 */
export function pillWidthFor(words: readonly string[]): string {
  const longest = Math.max(...words.map(emOf))
  const px = Math.ceil(longest * SAY_FONT_PX + PILL_SIDES_PX)

  return `calc(${px}rem / ${BASE_FONT_PX})`
}

export const ABLE: readonly string[] = ['有効', '無効']

export function AbleSay({ able }: { able: boolean }) {
  return (
    <Badge variant={able ? 'ok' : 'mute'} style={{ width: pillWidthFor(ABLE) }}>
      {able ? ABLE[0] : ABLE[1]}
    </Badge>
  )
}

export function toneOf(variant: string): StateTone {
  if (
    variant === 'ok' ||
    variant === 'warn' ||
    variant === 'err' ||
    variant === 'info'
  ) {
    return variant
  }

  return variant === 'sky' ? 'info' : 'mute'
}

export function StatusCell({ children }: { children: ReactNode }) {
  return (
    <span
      data-slot="status-cell"
      className="flex items-center justify-start text-left"
    >
      {children}
    </span>
  )
}

export function StateSay({
  tone = 'mute',
  bold = false,
  dot = true,
  className,
  children,
  ...props
}: ComponentProps<'span'> & {
  tone?: StateTone
  bold?: boolean
  dot?: boolean
}) {
  return (
    <span
      data-slot="state-say"
      data-state-say=""
      data-tone={tone}
      className={cn(
        'inline-flex min-w-0 items-center gap-1.5 text-ui whitespace-nowrap',
        SAY_TONE[tone],
        bold && 'font-bold',
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full bg-current"
        />
      )}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  )
}

export function alsoSays(
  term: StateTerm,
  ...more: (string | undefined | false)[]
): StateTerm {
  const rest = more.filter((one): one is string => Boolean(one))

  if (rest.length === 0) {
    return term
  }

  return {
    label: term.label,
    explanation: [term.explanation, ...rest].join('\n'),
  }
}
