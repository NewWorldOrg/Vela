import type { Meta, StoryObj } from '@storybook/nextjs'

import { Button } from '@/components/ui/button'
import { Surface } from '@/components/vela/surface'
import { Spinner } from '@/components/vela/progress'
import {
  EditIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
} from '@/components/vela/icons'

function hold(event: React.MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
}

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: { layout: 'centered' },
  args: { children: '変更' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'tone', 'ghost', 'danger', 'dangerFill'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Variants: Story = {
  render: (args) => (
    <Surface className="max-w-[640px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <Button {...args} variant="default">
          <PlusIcon />
          予約を追加
        </Button>
        <Button {...args} variant="tone">
          <PlayIcon />
          外部プレイヤーで再生
        </Button>
        <Button {...args} variant="tone">
          <EditIcon />
          変更
        </Button>
        <Button {...args} variant="ghost">
          閉じる
        </Button>
        <Button {...args} variant="danger">
          <TrashIcon />
          削除
        </Button>
        <Button {...args} variant="dangerFill">
          <TrashIcon />
          削除する
        </Button>
      </div>
    </Surface>
  ),
}

function StateRow({ label, className }: { label: string; className?: string }) {
  return (
    <div className="flex items-center gap-3 border-t border-hair py-3 first:border-t-0 first:pt-0">
      <span className="w-[74px] shrink-0 text-note text-ink-2">{label}</span>
      <span className="flex flex-wrap items-center gap-2.5">
        <Button variant="default" className={className}>
          <PlusIcon />
          予約を追加
        </Button>
        <Button variant="tone" className={className}>
          変更
        </Button>
        <Button variant="danger" className={className}>
          削除
        </Button>
      </span>
    </div>
  )
}

export const States: Story = {
  render: () => (
    <Surface className="max-w-[640px]">
      <StateRow label="通常" />
      <StateRow label="押下" className="scale-[0.98]" />
      <StateRow label="フォーカス" className="shadow-ring" />
      <div className="flex items-center gap-3 border-t border-hair py-3">
        <span className="w-[74px] shrink-0 text-note text-ink-2">無効</span>
        <span className="flex flex-wrap items-center gap-2.5">
          <Button variant="default" disabled>
            <PlusIcon />
            予約を追加
          </Button>
          <Button variant="tone" disabled>
            変更
          </Button>
          <Button variant="danger" disabled>
            削除
          </Button>
        </span>
      </div>
      <div className="flex items-center gap-3 border-t border-hair py-3">
        <span className="w-[74px] shrink-0 text-note text-ink-2">
          ローディング
        </span>
        <span className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="default"
            aria-busy="true"
            aria-disabled
            onClick={hold}
          >
            <Spinner size="control" />
            保存しています
          </Button>
          <Button variant="tone" aria-busy="true" aria-disabled onClick={hold}>
            <Spinner size="control" />
            保存しています
          </Button>
        </span>
      </div>
    </Surface>
  ),
}

export const Sizes: Story = {
  render: () => (
    <Surface className="max-w-[560px]">
      <div className="flex flex-col gap-5">
        {(['lg', 'default', 'sm'] as const).map((size) => (
          <div key={size} className="flex items-center gap-3">
            <span className="w-[74px] shrink-0 font-code text-note text-ink-2">
              {size}
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button size={size}>録画を開始</Button>
              <Button size={size} variant="tone">
                キャンセル
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Surface>
  ),
}

export const IconOnly: Story = {
  render: () => (
    <Surface>
      <div className="flex flex-wrap items-center gap-5">
        <Button size="icon" aria-label="予約を追加">
          <PlusIcon />
        </Button>
      </div>
    </Surface>
  ),
}

export const Disabled: Story = {
  args: { disabled: true },
}
