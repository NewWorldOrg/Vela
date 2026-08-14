import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs'

import type { Recording } from '@/repository/recordings'
import { RECORDING_FIXTURES } from '@/repository/recordings.fixtures'
import { DeleteRecordingDialog } from '@/feature/recordings/delete-recording-dialog'
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

export const ConfirmDialog: Story = {
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
}

export const DeleteRecording: Story = {
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
          />
          <p className="mt-[11px] text-cap text-ink-3">
            取り返しのつかない操作は、消える対象を全て見せてから確認する。番組名だけでなくファイルのパスとサイズまで出す。
          </p>
        </Surface>
      </div>
    )
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
