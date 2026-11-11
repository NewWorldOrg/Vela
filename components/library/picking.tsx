'use client'

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
  type Ref,
} from 'react'

import { cn } from '@/lib/utils'
import { signedOut } from '@/lib/signed-out'
import {
  PICKED_TAIL,
  PICKED_UNIT,
  pickedSaying,
  type PickedSubject,
} from '@/lib/library-picking'
import { thumbnailRemakeSaying } from '@/lib/recordings'
import type {
  Recording,
  RecordingBatch,
  ThumbnailRemakeRow,
  ThumbnailRemakes,
} from '@/repository/recordings'
import { Button } from '@/components/ui/button'
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
import {
  CheckIcon,
  CloseIcon,
  RebuildIcon,
  TrashIcon,
  WarningIcon,
} from '@/components/vela/icons'
import { iconButtonVariants } from '@/components/vela/icon-button'
import { Spinner } from '@/components/vela/spinner'
import { useToast } from '@/components/vela/toast'

const SIGNED_OUT = signedOut('操作')

/** What the choosing bar and the phone's band press, and the question asked before the picked recordings go. */
export interface PickedDeletion {
  pending: boolean
  /** Whether `削除` can be pressed: something is picked and none of it is still being recorded. */
  deletable: boolean
  ask: () => void
  dialog: ReactNode
}

/** Asks before deleting the picked recordings, deletes them, and says what was left when not all of them went. */
export function usePickedDeletion(
  chosen: Recording[],
  onDeleteAll: (ids: string[]) => Promise<RecordingBatch>,
  onDone: () => void,
): PickedDeletion {
  const [pending, startTransition] = useTransition()
  const [asking, setAsking] = useState(false)
  const say = useToast()
  const deletable =
    chosen.length > 0 && chosen.every((one) => one.outcome !== 'recording')

  const remove = (): void => {
    startTransition(async () => {
      const result = await onDeleteAll(chosen.map((one) => one.id))

      if (result.state === 'ok') {
        onDone()

        return
      }

      const said =
        result.state === 'unauthenticated' ? SIGNED_OUT : result.message

      say({
        text:
          result.done === 0 ? said : `${result.done} 件を削除しました。${said}`,
      })
    })
  }

  const dialog = (
    <AlertDialog open={asking} onOpenChange={setAsking}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            選択した {chosen.length} 件の録画を削除します
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <ul className="max-h-[calc(240rem/16)] space-y-1 overflow-y-auto text-left text-ui">
              {chosen.map((one) => (
                <li key={one.id} className="flex flex-wrap gap-x-3">
                  <b className="font-bold text-ink">{one.title}</b>
                  <span className="font-code text-ink-2">
                    {one.recordedRange}
                  </span>
                </li>
              ))}
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className="flex items-center gap-2 rounded-md bg-coral-soft px-3.5 py-2.5 text-ui font-medium text-coral">
          <WarningIcon className="size-4 shrink-0" />
          録画ファイルも削除されます。元に戻せません。
        </p>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            variant="danger"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              setAsking(false)
              remove()
            }}
          >
            <TrashIcon />
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return { pending, deletable, ask: () => setAsking(true), dialog }
}

/** One press at the end of the choosing bar and band: what it is called, its icon and colour, and whether it can be pressed now. `short` is the word a phone's band uses when the whole label would not fit beside the others. */
export interface PickedAction {
  label: string
  short?: string
  icon: ReactNode
  variant: 'danger' | 'redo'
  pending: boolean
  enabled: boolean
  onPress: () => void
}

/** The library's `削除` as the press at the end of the bar. */
export function deletionAction(deletion: PickedDeletion): PickedAction {
  return {
    label: '削除',
    icon: <TrashIcon />,
    variant: 'danger',
    pending: deletion.pending,
    enabled: deletion.deletable,
    onPress: deletion.ask,
  }
}

/** What the press of `サムネイルを再生成` did to the picked recordings: the press itself, and why each one that was not queued was left out. */
export interface PickedRemake {
  pending: boolean
  /** Whether `サムネイルを再生成` can be pressed: something is picked and none of it is still being recorded. */
  remakable: boolean
  remake: () => void
  said: ReadonlyMap<string, string>
}

const NO_REASONS: ReadonlyMap<string, string> = new Map()

/** Asks the backend to make the picked recordings' thumbnails again, says in one toast how many it took, and keeps the reason each one it did not take was left out, until choosing ends. */
export function usePickedRemake(
  chosen: Recording[],
  choosing: boolean,
  onRemakeAll: (ids: string[]) => Promise<ThumbnailRemakes>,
  onQueued: (ids: string[], every: boolean) => void,
): PickedRemake {
  const [pending, startTransition] = useTransition()
  const [said, setSaid] = useState<ReadonlyMap<string, string>>(NO_REASONS)
  const say = useToast()
  const remakable =
    chosen.length > 0 && chosen.every((one) => one.outcome !== 'recording')

  if (!choosing && said !== NO_REASONS) {
    setSaid(NO_REASONS)
  }

  const remake = (): void => {
    if (pending || !remakable) {
      return
    }

    startTransition(async () => {
      const result = await onRemakeAll(chosen.map((one) => one.id))

      if (result.state !== 'ok') {
        say({
          text:
            result.state === 'unauthenticated' ? SIGNED_OUT : result.message,
        })

        return
      }

      const left = result.items.filter(
        (one): one is ThumbnailRemakeRow & { reason: string } =>
          one.reason !== undefined,
      )
      const queued = result.items
        .filter((one) => one.reason === undefined)
        .map((one) => one.id)

      setSaid(new Map(left.map((one) => [one.id, one.reason])))
      say({ text: thumbnailRemakeSaying(queued.length, left.length) })
      onQueued(queued, left.length === 0)
    })
  }

  return { pending, remakable, remake, said }
}

/** The library's `サムネイルを再生成` as a press on the bar, in the amber of doing something again. */
export function remakeAction(remake: PickedRemake): PickedAction {
  return {
    label: 'サムネイルを再生成',
    short: '再生成',
    icon: <RebuildIcon />,
    variant: 'redo',
    pending: remake.pending,
    enabled: remake.remakable,
    onPress: remake.remake,
  }
}

/** The room left at the end of a list that scrolls inside itself, so the floating bar does not cover its last row. */
export const ROOM_FOR_THE_BAR = 'pb-[calc(80rem/16)]'

/** Leaves choosing on Esc, unless a dialog, a menu or a list is open to take the key first. */
export function useLeaveOnEscape(choosing: boolean, leave: () => void): void {
  useEffect(() => {
    if (!choosing) {
      return
    }

    const leaveOnEscape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented) {
        return
      }

      if (
        event.target instanceof Element &&
        event.target.closest(
          '[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"]',
        )
      ) {
        return
      }

      leave()
    }

    document.addEventListener('keydown', leaveOnEscape)

    return () => document.removeEventListener('keydown', leaveOnEscape)
  }, [choosing, leave])
}

/** The `選ぶ` at the head of a list, drawn pressed while the list is choosing. */
export function PickToggle({
  pressed,
  onPress,
  ref,
  className,
}: {
  pressed: boolean
  onPress: () => void
  ref?: Ref<HTMLButtonElement>
  className?: string
}) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed}
      onClick={onPress}
      className={cn(
        iconButtonVariants(),
        'h-10 w-auto px-4 text-ui font-semibold text-ink',
        pressed &&
          'bg-accent-tint text-acc-text not-disabled:hover:bg-accent-tint not-disabled:hover:text-acc-text',
        className,
      )}
    >
      選ぶ
    </button>
  )
}

/** How many are picked, or while none is, that recordings are to be chosen. On a phone's band the word after the count goes when the width is too narrow for the three presses beside it. */
function PickedCount({
  count,
  subject,
  className,
  onABand = false,
}: {
  count: number
  subject: PickedSubject
  className: string
  onABand?: boolean
}) {
  if (count === 0) {
    return (
      <span className={cn(className, 'text-ink-2')}>
        {pickedSaying(count, subject)}
      </span>
    )
  }

  return (
    <span className={cn(className, 'text-ink')}>
      <span className="font-code">{count}</span>
      {onABand ? (
        <>
          {PICKED_UNIT}
          <span className="max-[479px]:hidden">{PICKED_TAIL}</span>
        </>
      ) : (
        `${PICKED_UNIT}${PICKED_TAIL}`
      )}
    </span>
  )
}

interface PickingControls {
  count: number
  everyPicked: boolean
  onEvery: () => void
  actions: readonly PickedAction[]
  subject: PickedSubject
}

function enabledOf(actions: readonly PickedAction[]): string {
  return actions.map((one) => (one.enabled ? '1' : '0')).join('')
}

function whatItDoes(subject: PickedSubject): string {
  return `選んだ${subject}の操作`
}

/** The bar floating in the middle of the window's foot while a list is choosing, from the press of `選ぶ` even before one is picked: close, how many, every one, and the one action. It rises in and sinks away, and while it sinks it stays drawn saying what it last said. */
export function PickingBar({
  shown,
  count,
  everyPicked,
  onEvery,
  onClose,
  actions,
  subject,
  closeRef,
  className,
}: PickingControls & {
  shown: boolean
  onClose: () => void
  closeRef?: Ref<HTMLButtonElement>
  className?: string
}) {
  const [drawn, setDrawn] = useState(shown)
  const [said, setSaid] = useState({
    count,
    everyPicked,
    enabled: enabledOf(actions),
  })
  const barRef = useRef<HTMLDivElement>(null)

  if (shown && !drawn) {
    setDrawn(true)
  }

  if (
    shown &&
    (said.count !== count ||
      said.everyPicked !== everyPicked ||
      said.enabled !== enabledOf(actions))
  ) {
    setSaid({ count, everyPicked, enabled: enabledOf(actions) })
  }

  useEffect(() => {
    const bar = barRef.current

    if (!bar || shown) {
      return
    }

    const { animationName, display } = getComputedStyle(bar)

    if (animationName === 'none' || display === 'none') {
      setDrawn(false)
    }
  }, [shown])

  if (!drawn) {
    return null
  }

  return (
    <div
      ref={barRef}
      role={shown ? 'toolbar' : undefined}
      aria-label={shown ? whatItDoes(subject) : undefined}
      aria-hidden={shown ? undefined : true}
      inert={!shown}
      data-slot="picking-bar"
      data-state={shown ? 'open' : 'closed'}
      onAnimationEnd={(event) => {
        if (!shown && event.target === event.currentTarget) {
          setDrawn(false)
        }
      }}
      className={cn(
        'fixed inset-x-0 bottom-[24px] z-50 mx-auto flex w-fit max-w-[calc(100vw-32rem/16)] items-center rounded-full bg-raised py-2 pr-2 pl-2 shadow-[0_0_0_1px_var(--hair),var(--lift)] [--from-y:calc(16rem/16)] data-[state=closed]:disappears data-[state=open]:appears',
        className,
      )}
    >
      <button
        ref={closeRef}
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className={cn(
          iconButtonVariants({ variant: 'quiet' }),
          'mr-3.5 size-10 bg-surface text-ink not-disabled:hover:bg-surface-2 not-disabled:hover:text-ink dark:bg-surface-3 dark:not-disabled:hover:bg-surface-2 [&_svg]:size-[calc(18rem/16)]',
        )}
      >
        <CloseIcon />
      </button>
      <PickedCount
        count={said.count}
        subject={subject}
        className="min-w-[calc(118rem/16)] text-section font-bold whitespace-nowrap"
      />
      <Button
        variant="tone"
        className="ml-5 dark:bg-surface-3"
        onClick={onEvery}
      >
        {said.everyPicked ? 'すべて外す' : 'すべて選ぶ'}
      </Button>
      {actions.map((action, at) => (
        <Button
          key={action.label}
          variant={action.variant}
          className="ml-3"
          disabled={action.pending || said.enabled[at] !== '1'}
          onClick={action.onPress}
        >
          {action.pending ? <Spinner size="control" /> : action.icon}
          {action.label}
        </Button>
      ))}
    </div>
  )
}

const BAND_PRESS = 'h-[calc(38rem/16)] px-3 text-ui'

/** The band over a phone's tabs while a list is choosing: how many, every one, and the actions. The presses wrap under the count when the width has no room for them beside it. */
export function PickingBand({
  count,
  everyPicked,
  onEvery,
  actions,
  subject,
  className,
}: PickingControls & { className?: string }) {
  return (
    <div
      role="toolbar"
      aria-label={whatItDoes(subject)}
      data-slot="picking-band"
      className={cn(
        'fixed inset-x-0 bottom-[var(--tab-bar-cover)] z-50 flex min-h-[calc(60rem/16)] flex-wrap items-center gap-2 bg-bg py-2 pr-3 pl-[calc(18rem/16)] shadow-[0_-1px_0_var(--hair)] sideways:left-[calc(80rem/16+env(safe-area-inset-left))] sideways:pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      <PickedCount
        count={count}
        subject={subject}
        className="text-title font-semibold whitespace-nowrap"
        onABand
      />
      <span className="ml-auto flex flex-wrap justify-end gap-2">
        <Button variant="tone" className={BAND_PRESS} onClick={onEvery}>
          {everyPicked ? 'すべて外す' : 'すべて選ぶ'}
        </Button>
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            className={BAND_PRESS}
            disabled={action.pending || !action.enabled}
            onClick={action.onPress}
          >
            {action.pending ? <Spinner size="control" /> : action.icon}
            {action.short ?? action.label}
          </Button>
        ))}
      </span>
    </div>
  )
}

/** The mark over a picture while the library is choosing: a rounded square cut from the picture by a white edge, filled with a tick once taken. */
export function PickMark({
  taken,
  size = 'row',
  className,
}: {
  taken: boolean
  size?: 'tile' | 'row' | 'phone'
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      data-slot="pick-mark"
      data-taken={taken || undefined}
      className={cn(
        'pointer-events-none absolute z-[2] grid place-items-center text-on-accent',
        MARK_PLACE[size],
        MARK_SIZE[size],
        taken
          ? 'bg-accent-fill shadow-[0_0_0_2px_#fff,0_1px_3px_rgba(0,0,0,.35)]'
          : 'bg-[rgba(20,20,22,.22)] shadow-[inset_0_0_0_2px_#fff,0_1px_3px_rgba(0,0,0,.35)]',
        className,
      )}
    >
      {taken && <CheckIcon className={TICK_SIZE[size]} strokeWidth={3} />}
    </span>
  )
}

const MARK_PLACE = {
  tile: 'top-[calc(9rem/16)] left-[calc(9rem/16)]',
  row: 'top-1.5 left-1.5',
  phone: 'top-1.5 left-1.5',
} as const

const MARK_SIZE = {
  tile: 'size-[calc(22rem/16)] rounded-[calc(6rem/16)]',
  row: 'size-[calc(18rem/16)] rounded-[calc(6rem/16)]',
  phone: 'size-5 rounded-[calc(6rem/16)]',
} as const

const TICK_SIZE = {
  tile: 'size-[calc(15rem/16)]',
  row: 'size-3',
  phone: 'size-[calc(13rem/16)]',
} as const

/** The shade at the head of a picture while choosing, so its mark reads on a bright picture. */
export function PickShade({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(0,0,0,.32),rgba(0,0,0,0)_42%)]',
        className,
      )}
    />
  )
}

/** On a mouse's screen, what the picture under the pointer shows while the library is not choosing; drawn with `group/pick` on what holds the picture and `data-resting` on it while the pointer rests there. */
export const SHOWN_AT_REST =
  'opacity-0 transition-opacity duration-[140ms] ease-toy group-data-resting/pick:opacity-100 group-has-[[data-slot=pick-start]:focus-visible]/pick:opacity-100'

/** On a mouse's screen, the check that comes up over the head of a recording's picture while the pointer rests on it, or while the keyboard is on it, and starts the library choosing with that one taken. */
export function PickStart({
  title,
  size,
  onStart,
}: {
  title: string
  size: 'tile' | 'row'
  onStart: () => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={false}
      aria-label={`${title} を選ぶ`}
      data-slot="pick-start"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onStart()
      }}
      className={cn(
        'tap-target absolute z-[3] grid cursor-pointer place-items-center outline-none focus-visible:shadow-ring',
        MARK_PLACE[size],
        MARK_SIZE[size],
        SHOWN_AT_REST,
        'focus-visible:opacity-100',
      )}
    >
      <PickMark taken={false} size={size} className="static" />
    </button>
  )
}
