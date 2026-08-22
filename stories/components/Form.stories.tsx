import type { Meta, StoryObj } from '@storybook/nextjs'

import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
  OptionGroup,
  RequiredMark,
} from '@/components/vela/field'
import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MarkPill, MarkRuler, MarkSplit } from '@/components/vela/icons'

const meta = {
  title: 'Components/Form',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function Sample({
  caption,
  children,
}: {
  caption: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-[7px]">
      <span className="font-code text-[10px] tracking-[0.06em] text-ink-3">
        {caption}
      </span>
      {children}
    </div>
  )
}

export const TextInputs: Story = {
  render: () => (
    <div className="mx-auto max-w-[720px] p-6">
      <SectionHeading mark={MarkRuler}>テキスト入力</SectionHeading>
      <Surface>
        <div className="grid gap-[17px] sm:grid-cols-2">
          <Sample caption="通常">
            <Field>
              <FieldLabel htmlFor="keyword">番組名キーワード</FieldLabel>
              <Input id="keyword" placeholder="番組名の一部を入力" />
              <FieldHint>この語を含む番組を自動で予約します。</FieldHint>
            </Field>
          </Sample>
          <Sample caption="フォーカス(--ring)">
            <Field>
              <FieldLabel htmlFor="dir">
                保存先ディレクトリ
                <RequiredMark />
              </FieldLabel>
              <Input
                id="dir"
                defaultValue="/data/recordings"
                className="border-brand font-code tabular-nums shadow-ring"
              />
              <FieldHint>空き容量が 10% を下回ると警告します。</FieldHint>
            </Field>
          </Sample>
          <Sample caption="エラー">
            <Field>
              <FieldLabel htmlFor="retention">
                保持期間(日)
                <RequiredMark />
              </FieldLabel>
              <Input
                id="retention"
                defaultValue="0"
                aria-invalid
                aria-describedby="retention-error"
                className="font-code tabular-nums"
              />
              <FieldError id="retention-error">
                1〜365 の整数で入力してください。
              </FieldError>
            </Field>
          </Sample>
          <Sample caption="無効">
            <Field>
              <FieldLabel htmlFor="device">デバイスパス</FieldLabel>
              <Input
                id="device"
                defaultValue="/dev/dvb/adapter0/frontend0"
                disabled
                className="font-code tabular-nums"
              />
              <FieldHint>ドライバの自動検出で設定されます。</FieldHint>
            </Field>
          </Sample>
        </div>
        <div className="mt-[17px]">
          <Field>
            <FieldLabel htmlFor="memo">メモ</FieldLabel>
            <Textarea id="memo" placeholder="運用上の申し送りを書く" />
          </Field>
        </div>
      </Surface>
      <p className="mt-[9px] text-note text-ink-3">
        入力の角丸は 10px。パス・数値は M PLUS 1 Code
        で組み、桁と区切りを読み取りやすくする。エラーは境界色+メッセージのみで示し、
        点滅やグローは使わない。
      </p>
    </div>
  ),
}

export const Selects: Story = {
  render: () => (
    <div className="mx-auto max-w-[720px] p-6">
      <SectionHeading mark={MarkSplit}>セレクト</SectionHeading>
      <Surface>
        <div className="grid gap-[17px] sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="preset">エンコードプリセット</FieldLabel>
            <Select defaultValue="h265-quality">
              <SelectTrigger id="preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="h265-quality">
                  H.265 1080p(画質優先)
                </SelectItem>
                <SelectItem value="h265-size">H.265 1080p(容量優先)</SelectItem>
                <SelectItem value="h264-720p">H.264 720p(互換重視)</SelectItem>
                <SelectItem value="none">
                  エンコードしない(TS のまま)
                </SelectItem>
              </SelectContent>
            </Select>
            <FieldHint>録画完了後にバックグラウンドで適用されます。</FieldHint>
          </Field>
          <Field>
            <FieldLabel htmlFor="tuner">優先チューナー</FieldLabel>
            <Select defaultValue="auto">
              <SelectTrigger id="tuner">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">自動(空きから割り当て)</SelectItem>
                <SelectItem value="adapter0">adapter0(地上)</SelectItem>
                <SelectItem value="adapter1">adapter1(地上)</SelectItem>
              </SelectContent>
            </Select>
            <FieldHint>録画が競合したときの割り当て順です。</FieldHint>
          </Field>
          <Field>
            <FieldLabel htmlFor="disabled-select">保存先プール</FieldLabel>
            <Select disabled>
              <SelectTrigger id="disabled-select">
                <SelectValue placeholder="自動検出で設定されます" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pool-a">pool-a</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Surface>
    </div>
  ),
}

export const Toggles: Story = {
  render: () => (
    <div className="mx-auto max-w-[720px] p-6">
      <SectionHeading mark={MarkPill}>
        スイッチ・チェックボックス・ラジオ
      </SectionHeading>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2.5">
        <OptionGroup title="スイッチ" className="col-span-full bg-brand-soft">
          <div className="flex items-center gap-[11px]">
            <Switch id="auto-encode" defaultChecked />
            <Label htmlFor="auto-encode">録画後に自動エンコード</Label>
          </div>
          <div className="flex items-center gap-[11px]">
            <Switch id="oneseg" />
            <Label htmlFor="oneseg">ワンセグ副チャンネルを含める</Label>
          </div>
          <div className="flex items-center gap-[11px]">
            <Switch id="subtitle-stream" defaultChecked disabled />
            <Label htmlFor="subtitle-stream" className="text-ink-3">
              字幕ストリームを保存
            </Label>
          </div>
          <div className="flex items-center gap-[11px]">
            <Switch id="small-switch" size="sm" defaultChecked />
            <Label htmlFor="small-switch">sm サイズ</Label>
          </div>
        </OptionGroup>

        <OptionGroup title="保存対象" className="bg-tint-sage">
          <div className="flex items-center gap-[9px]">
            <Checkbox id="save-subtitle" defaultChecked />
            <Label htmlFor="save-subtitle">字幕を保存</Label>
          </div>
          <div className="flex items-center gap-[9px]">
            <Checkbox id="save-data" />
            <Label htmlFor="save-data">データ放送を保存</Label>
          </div>
          <div className="flex items-center gap-[9px]">
            <Checkbox id="save-logo" disabled />
            <Label htmlFor="save-logo" className="text-ink-3">
              ロゴを保存
            </Label>
          </div>
        </OptionGroup>

        <OptionGroup title="TS の扱い" className="bg-tint-butter">
          <RadioGroup defaultValue="keep">
            <div className="flex items-center gap-[9px]">
              <RadioGroupItem value="keep" id="ts-keep" />
              <Label htmlFor="ts-keep">すべての録画で TS を保持</Label>
            </div>
            <div className="flex items-center gap-[9px]">
              <RadioGroupItem value="drop" id="ts-drop" />
              <Label htmlFor="ts-drop">検証後に TS を削除</Label>
            </div>
          </RadioGroup>
        </OptionGroup>
      </div>
      <p className="mt-[9px] text-note text-ink-3">
        選択肢のまとまりは枠で囲わず淡い色面で分ける。ノブとチェックは --ease
        でわずかに行き過ぎてから収まる。
      </p>
    </div>
  ),
}
