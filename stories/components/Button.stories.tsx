import type { Meta, StoryObj } from '@storybook/nextjs'

import { Button } from '@/components/ui/button'
import { Surface } from '@/components/vela/surface'
import { Spinner } from '@/components/vela/progress'
import { PlusIcon, TrashIcon } from '@/components/vela/icons'

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: { layout: 'centered' },
  args: { children: '編集' },
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'outline',
        'secondary',
        'ghost',
        'destructive',
        'destructiveFill',
        'link',
      ],
    },
    size: {
      control: 'select',
      options: [
        'default',
        'xs',
        'sm',
        'lg',
        'icon',
        'icon-xs',
        'icon-sm',
        'icon-lg',
      ],
    },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Variants: Story = {
  render: (args) => (
    <Surface className="max-w-[560px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <Button {...args} variant="default">
          <PlusIcon />
          予約を追加
        </Button>
        <Button {...args} variant="outline">
          編集
        </Button>
        <Button {...args} variant="ghost">
          詳細
        </Button>
        <Button {...args} variant="destructive">
          <TrashIcon />
          削除
        </Button>
        <Button {...args} variant="destructiveFill">
          破棄して再取得
        </Button>
        <Button {...args} variant="secondary">
          複製
        </Button>
        <Button {...args} variant="link">
          切り分けを見る
        </Button>
      </div>
      <p className="mt-[11px] text-cap text-ink-3">
        新規作成=default ・ 編集=outline ・ 削除・破壊的操作=destructive ・
        ghost は行内の補助操作に限る
      </p>
    </Surface>
  ),
}

/** hover / 押下 は静止画でも伝わるよう、その状態を固定したサンプルで並べる。 */
const HOVER = '-translate-x-px -translate-y-px shadow-pop-lg'
const PRESS = 'translate-x-px translate-y-px shadow-pop-none'
const FOCUS = 'shadow-pop-ring'

/** ghost は影を持たないので、固定サンプルでも影のクラスは当てない。 */
const QUIET: Record<string, string> = {
  [HOVER]: '-translate-y-px bg-surface-2 text-ink',
  [PRESS]: 'bg-surface-2 text-ink',
  [FOCUS]: 'shadow-ring',
}

function StateRow({
  label,
  note,
  extra,
}: {
  label: string
  note?: string
  extra?: string
}) {
  return (
    <div className="flex items-center gap-3 py-[11px] not-first:border-t not-first:border-dashed not-first:border-line first:pt-0.5">
      <span className="w-[74px] shrink-0 text-cap leading-[1.5] text-ink-3">
        {label}
        {note && (
          <em className="block font-code text-[9.5px] not-italic">{note}</em>
        )}
      </span>
      <span className="flex flex-wrap items-center gap-[9px]">
        <Button variant="default" className={extra}>
          <PlusIcon />
          予約を追加
        </Button>
        <Button variant="outline" className={extra}>
          編集
        </Button>
        <Button variant="ghost" className={extra ? QUIET[extra] : undefined}>
          詳細
        </Button>
        <Button variant="destructive" className={extra}>
          削除
        </Button>
      </span>
    </div>
  )
}

export const States: Story = {
  render: () => (
    <Surface className="max-w-[620px]">
      <StateRow label="通常" />
      <StateRow label="ホバー" note="+1px / 3px 影" extra={HOVER} />
      <StateRow label="押下" note="-1px / 影 0" extra={PRESS} />
      <StateRow label="フォーカス" note="--ring" extra={FOCUS} />
      <div className="flex items-center gap-3 border-t border-dashed border-line py-[11px]">
        <span className="w-[74px] shrink-0 text-cap text-ink-3">無効</span>
        <span className="flex flex-wrap items-center gap-[9px]">
          <Button variant="default" disabled>
            <PlusIcon />
            予約を追加
          </Button>
          <Button variant="outline" disabled>
            編集
          </Button>
          <Button variant="ghost" disabled>
            詳細
          </Button>
          <Button variant="destructive" disabled>
            削除
          </Button>
        </span>
      </div>
      <div className="flex items-center gap-3 border-t border-dashed border-line py-[11px]">
        <span className="w-[74px] shrink-0 text-cap text-ink-3">
          ローディング
        </span>
        <span className="flex flex-wrap items-center gap-[9px]">
          <Button
            variant="default"
            aria-busy="true"
            className="pointer-events-none"
          >
            <Spinner className="size-[13px]" />
            保存しています
          </Button>
          <Button
            variant="outline"
            aria-busy="true"
            className="pointer-events-none"
          >
            <Spinner className="size-[13px]" />
            保存しています
          </Button>
        </span>
      </div>
      <p className="mt-[11px] text-cap text-ink-3">
        ホバー・押下の行は、その状態を固定したサンプル。実物は「種類」「サイズ」の行で
        ポインタを載せて確認する。ローディングはスピナー+ラベルを保ち、幅を変えない。
      </p>
    </Surface>
  ),
}

export const Sizes: Story = {
  render: () => (
    <Surface className="max-w-[560px]">
      <div className="flex flex-col gap-5">
        {(['lg', 'default', 'sm', 'xs'] as const).map((size) => (
          <div key={size} className="flex items-center gap-3">
            <span className="w-[74px] shrink-0 font-code text-cap text-ink-3">
              {size}
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button size={size}>録画を開始</Button>
              <Button size={size} variant="outline">
                キャンセル
              </Button>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-[11px] text-cap text-ink-3">
        default ・ 高さ 34px ／ sm ・ 高さ 28px(一覧の行内・ダイアログのフッタ)
      </p>
    </Surface>
  ),
}

export const IconOnly: Story = {
  render: () => (
    <Surface>
      <div className="flex flex-wrap items-center gap-5">
        {(['icon-lg', 'icon', 'icon-sm', 'icon-xs'] as const).map((size) => (
          <Button key={size} size={size} aria-label="予約を追加">
            <PlusIcon />
          </Button>
        ))}
      </div>
    </Surface>
  ),
}

export const Disabled: Story = {
  args: { disabled: true },
}
