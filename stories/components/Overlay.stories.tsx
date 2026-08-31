import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, within } from 'storybook/test'

import type { Recording } from '@/repository/recordings'
import { RECORDING_FIXTURES } from '@/stories/fixtures/recordings'
import { DeleteRecordingDialog } from '@/components/recordings/delete-recording-dialog'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'
import {
  MarkPanel,
  MarkSplit,
  TrashIcon,
  WarningIcon,
} from '@/components/vela/icons'

const meta = {
  title: 'Components/Overlay',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/**
 * Radix marks everything outside an open layer `aria-hidden` while the trigger
 * under it stays focusable. That is the right thing for it to do and is exactly
 * what `aria-hidden-focus` is for, but it is a fact about a page being held
 * open on purpose, not about what is inside the layer. So the a11y context is
 * narrowed to the layer the story is about, and the rest of the page — checked
 * by every other story, closed — is left out of it.
 */
const ONLY_THE_OPEN_LAYER = (slot: string) => ({
  a11y: { context: { include: `[data-slot="${slot}"]` } },
})

export const ConfirmDialog: Story = {
  parameters: ONLY_THE_OPEN_LAYER('dialog-content'),
  render: () => (
    <div className="mx-auto max-w-[620px] p-6">
      <SectionHeading mark={WarningIcon}>確認モーダル(危険操作)</SectionHeading>
      <Surface>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive">EPG を破棄して再取得</Button>
          </DialogTrigger>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>EPG を全て破棄して作り直しますか?</DialogTitle>
              <DialogDescription>
                保存済みの番組情報{' '}
                <b className="font-code font-medium tabular-nums text-ink">
                  12,480 件
                </b>{' '}
                を削除し、全チューナーで再取得します。完了までは番組表が空になります。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" size="sm">
                  キャンセル
                </Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="destructiveFill" size="sm">
                  破棄して再取得
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <p className="mt-[11px] text-cap text-ink-3">
          危険操作の実行ボタンのみ塗りの danger を使い、キャンセルは常に outline
          で左側に置く。
        </p>
      </Surface>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole('button', { name: 'EPG を破棄して再取得' }),
    )
    await expect(await within(document.body).findByRole('dialog')).toBeVisible()

    // Left open on purpose: postVisit measures what is on the page.
  },
}

export const DeleteRecording: Story = {
  parameters: ONLY_THE_OPEN_LAYER('alert-dialog-content'),
  render: function DeleteRecordingStory() {
    const [target, setTarget] = useState<Recording | null>(null)

    return (
      <div className="mx-auto max-w-[620px] p-6">
        <SectionHeading mark={TrashIcon}>録画の削除確認</SectionHeading>
        <Surface>
          <Button
            variant="destructive"
            onClick={() => setTarget(RECORDING_FIXTURES[1])}
          >
            <TrashIcon />
            削除
          </Button>
          <DeleteRecordingDialog
            recording={target}
            onOpenChange={(open) => !open && setTarget(null)}
            onDelete={async () => ({ state: 'ok', filesRemoved: 1 })}
          />
          <p className="mt-[11px] text-cap text-ink-3">
            取り返しのつかない操作は、消える対象を全て見せてから確認する。番組名だけでなくファイルのパスとサイズまで出す。
          </p>
        </Surface>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: '削除' }))
    await expect(
      await within(document.body).findByRole('alertdialog'),
    ).toBeVisible()

    // Left open on purpose: postVisit measures what is on the page.
  },
}

export const SidePanel: Story = {
  render: () => (
    <div className="mx-auto max-w-[620px] p-6">
      <SectionHeading mark={MarkSplit}>右サイドパネル(番組詳細)</SectionHeading>
      <Surface>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">番組詳細を開く</Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>番組詳細</SheetTitle>
            </SheetHeader>
            <SheetBody>
              <div className="heading text-title leading-[1.5]">
                みなと ニュース7
              </div>
              <div className="mt-[3px] mb-2.5 font-code text-cap tabular-nums text-ink-3">
                みなと総合1 / 8/7(木) 21:00 – 22:00
              </div>
              <SheetDescription>
                国内外のきょうの動きを、現場からの中継と丁寧な取材で深掘り。経済・スポーツの最新情報と、あすの天気もあわせてお伝えします。
              </SheetDescription>
            </SheetBody>
            <SheetFooter>
              <Button size="sm">録画予約</Button>
              <Button variant="ghost" size="sm">
                番組表で表示
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <p className="mt-[11px] text-cap text-ink-3">
          浮いているものは 1px 線 + 大きめの hard
          shadow。開いたら必ず閉じられる。
        </p>
      </Surface>
    </div>
  ),
}

export const BottomSheet: Story = {
  render: () => (
    <div className="mx-auto max-w-[620px] p-6">
      <SectionHeading mark={MarkPanel}>ボトムシート(モバイル)</SectionHeading>
      <Surface>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">ボトムシートを開く</Button>
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>みなと ニュース7</SheetTitle>
            </SheetHeader>
            <SheetBody>
              <div className="mb-2.5 font-code text-cap tabular-nums text-ink-3">
                みなと総合1 / 21:00 – 22:00
              </div>
              <SheetDescription>
                国内外のきょうの動きを、現場からの中継と丁寧な取材で深掘りしてお伝えします。
              </SheetDescription>
            </SheetBody>
            <SheetFooter>
              <Button className="w-full justify-center">録画予約</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </Surface>
    </div>
  ),
}

/**
 * A list left open, because the run measures the page as the story leaves it.
 *
 * The rows of an open list went unmeasured for as long as they did partly
 * because they were waived and partly because no story ever ended with a list
 * on the screen: the one story that opened a menu closed it again before the
 * probe looked. Lifting the waiver alone would have changed nothing. This is
 * the story that puts the rows in front of the probe.
 */
export const OpenList: Story = {
  parameters: ONLY_THE_OPEN_LAYER('select-content'),
  render: () => (
    <div className="mx-auto max-w-[620px] p-6">
      <SectionHeading mark={MarkSplit}>開いた選択肢</SectionHeading>
      <Surface>
        <Select defaultValue="ts">
          <SelectTrigger aria-label="録画の画質" className="w-[240px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ts">そのまま(TS)</SelectItem>
            <SelectItem value="h265">高画質(H.265)</SelectItem>
            <SelectItem value="h264">標準(H.264)</SelectItem>
            <SelectItem value="audio" disabled>
              音声のみ
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="mt-[11px] text-cap text-ink-3">
          選択肢は隣と隙間なく並ぶので、当たり判定ではなく行の高さそのものが
          44px。密度は落ちるが、隣の行が押されるよりはよい。
        </p>
      </Surface>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const opener = canvas.getByRole('combobox', { name: '録画の画質' })
    await userEvent.click(opener)

    const rows = await within(document.body).findAllByRole('option')
    await expect(rows).toHaveLength(4)

    // A row that is off keeps taking pointer events, because that is the only
    // way it can say `not-allowed` under the pointer. What refuses the press is
    // the list itself, and this is the assertion that says so: the row is
    // pressed, and nothing is chosen.
    const off = rows.find((row) => row.hasAttribute('data-disabled'))
    await expect(off).toBeTruthy()
    await userEvent.click(off as HTMLElement)
    await expect(opener).toHaveTextContent('そのまま(TS)')
    await expect(
      await within(document.body).findByRole('listbox'),
    ).toBeVisible()

    // Left open on purpose: postVisit measures what is on the page.
  },
}

/** A menu left open, for the same reason and measured the same way. */
export const OpenMenu: Story = {
  parameters: ONLY_THE_OPEN_LAYER('dropdown-menu-content'),
  render: () => (
    <div className="mx-auto max-w-[620px] p-6">
      <SectionHeading mark={MarkPanel}>開いたメニュー</SectionHeading>
      <Surface>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">表示する列</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>表示する列</DropdownMenuLabel>
            <DropdownMenuCheckboxItem checked>放送局</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked>
              録画日時
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem disabled>容量</DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>並びを既定に戻す</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <p className="mt-[11px] text-cap text-ink-3">
          メニューの行も同じ 44px。見出しと最初の行の間は、行どうしより
          狭くしない。
        </p>
      </Surface>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: '表示する列' }))

    const menu = await within(document.body).findByRole('menu')
    await expect(menu).toBeVisible()

    // The same as the list: the row that is off is pressed, and the menu is
    // still there afterwards because the menu, not `pointer-events`, is what
    // refuses it.
    const off = within(menu)
      .getAllByRole('menuitemcheckbox')
      .find((row) => row.hasAttribute('data-disabled'))
    await expect(off).toBeTruthy()
    await userEvent.click(off as HTMLElement)
    await expect(menu).toBeVisible()
    await expect(off).toHaveAttribute('aria-checked', 'false')

    // Left open on purpose: postVisit measures what is on the page.
  },
}
