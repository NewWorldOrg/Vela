import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

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
  SELECT_LEAST_ROOM,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MarkPill, MarkRuler, MarkSplit } from '@/components/vela/icons'
import { PasswordInput } from '@/components/vela/password-input'

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

function PasswordSamples() {
  return (
    <div className="mx-auto max-w-[720px] p-6">
      <SectionHeading mark={MarkRuler}>パスワード入力</SectionHeading>
      <Surface>
        <div className="grid gap-[17px] sm:grid-cols-2">
          <Sample caption="通常">
            <Field>
              <FieldLabel htmlFor="current-secret">いまのパスワード</FieldLabel>
              <PasswordInput
                id="current-secret"
                autoComplete="current-password"
                defaultValue="打った文字は読めるべき"
              />
            </Field>
          </Sample>
          <Sample caption="無効">
            <Field>
              <FieldLabel htmlFor="held-secret">client secret</FieldLabel>
              <PasswordInput id="held-secret" defaultValue="保持中" disabled />
              <FieldHint>保存したあとは読み出せません。</FieldHint>
            </Field>
          </Sample>
        </div>
      </Surface>
      <p className="mt-[9px] text-note text-ink-3">
        マスクは切り替えられる。打ったものが読めないと、断られたのか打ち間違えたのかが本人にも分からない。
        切り替えは欄の中ではなく横に置く。44px の触れる面は載せた側が press
        を受け取るので、欄の中に置くと右端で文字を選べなくなる。
      </p>
    </div>
  )
}

export const Passwords: Story = { render: () => <PasswordSamples /> }

export const パスワードを表示中: Story = {
  render: () => <PasswordSamples />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(
      canvas.getAllByRole('button', { name: 'パスワードを表示する' })[0],
    )

    await expect(canvas.getByLabelText('いまのパスワード')).toHaveAttribute(
      'type',
      'text',
    )
  },
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
                <SelectItem value="adapter0">adapter0(地上波)</SelectItem>
                <SelectItem value="adapter1">adapter1(地上波)</SelectItem>
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

const SWITCH_STATES = [
  { id: 'switch-off', label: '切', checked: false, size: 'default' },
  { id: 'switch-on', label: '入', checked: true, size: 'default' },
  { id: 'switch-sm-off', label: 'sm 切', checked: false, size: 'sm' },
  { id: 'switch-sm-on', label: 'sm 入', checked: true, size: 'sm' },
] as const

const DISTINCT_ENOUGH = 3

function luminance(painted: string): number {
  const [red, green, blue] = (painted.match(/[\d.]+/g) ?? [])
    .slice(0, 3)
    .map((channel) => Number(channel) / 255)
    .map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    )

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function knobStandsOut(control: HTMLElement): void {
  const thumb = control.querySelector('[data-slot="switch-thumb"]')

  if (thumb === null) {
    throw new Error('a switch is drawn without its knob')
  }

  const knob = luminance(getComputedStyle(thumb).backgroundColor)
  const track = luminance(getComputedStyle(control).backgroundColor)

  if (control.getAttribute('aria-checked') === 'true') {
    expect(
      (Math.max(knob, track) + 0.05) / (Math.min(knob, track) + 0.05),
    ).toBeGreaterThanOrEqual(DISTINCT_ENOUGH)
  } else {
    expect(knob).toBeGreaterThan(track)
  }
}

export const スイッチの入と切: Story = {
  render: () => (
    <div className="mx-auto max-w-[720px] p-6">
      <Surface>
        <div className="flex flex-col items-start gap-[26px]">
          {SWITCH_STATES.map((one) => (
            <div key={one.id} className="flex items-center gap-[11px]">
              <Switch
                id={one.id}
                size={one.size}
                defaultChecked={one.checked}
              />
              <Label htmlFor={one.id}>{one.label}</Label>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    for (const control of canvas.getAllByRole('switch')) {
      knobStandsOut(control)
    }

    const off = canvas.getByRole('switch', { name: '切' })

    await userEvent.click(off)
    await waitFor(() => expect(off).toHaveAttribute('aria-checked', 'true'))
    await waitFor(() => knobStandsOut(off))
  },
}

const POOLS = [
  { value: 'pool-a', label: 'pool-a(既定)' },
  { value: 'pool-b', label: 'pool-b' },
  { value: 'pool-c', label: 'pool-c' },
  { value: 'pool-d', label: 'pool-d' },
  { value: 'pool-e', label: 'pool-e' },
  { value: 'pool-f', label: 'pool-f(最後)' },
]

function PoolSelect({ id }: { id: string }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>保存先プール</FieldLabel>
      <Select defaultValue="pool-a">
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {POOLS.map((pool) => (
            <SelectItem key={pool.value} value={pool.value}>
              {pool.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

async function opened(): Promise<HTMLElement> {
  return waitFor(() => {
    const content = document.querySelector('[data-slot="select-content"]')

    if (!(content instanceof HTMLElement)) {
      throw new Error('the select did not open')
    }

    return content
  })
}

export const 画面の下端のセレクト: Story = {
  render: () => (
    <div className="px-6 pb-6">
      <div className="h-[calc(100vh-88px)]" />
      <div className="max-w-[360px]">
        <PoolSelect id="pool-at-the-foot" />
      </div>
      <div className="h-[80vh]" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('combobox', {
      name: '保存先プール',
    })

    await expect(
      window.innerHeight - trigger.getBoundingClientRect().bottom,
    ).toBeLessThan(SELECT_LEAST_ROOM)

    await userEvent.click(trigger)

    const content = await opened()
    const box = content.getBoundingClientRect()

    await expect(content).toHaveAttribute('data-side', 'bottom')
    await expect(Math.round(box.top)).toBeGreaterThanOrEqual(
      Math.round(trigger.getBoundingClientRect().top),
    )
    await expect(Math.round(box.height)).toBeGreaterThanOrEqual(
      SELECT_LEAST_ROOM,
    )
    await expect(Math.round(box.bottom)).toBeLessThanOrEqual(
      Math.round(window.innerHeight),
    )

    const options = within(content).getAllByRole('option')
    const last = options[options.length - 1]

    await expect(
      Math.round(last.getBoundingClientRect().bottom),
    ).toBeLessThanOrEqual(Math.round(window.innerHeight))

    await userEvent.click(last)
    await waitFor(() =>
      expect(document.querySelector('[data-slot="select-content"]')).toBeNull(),
    )
    await expect(trigger).toHaveTextContent('pool-f(最後)')
  },
}

export const 対話の中の下端のセレクト: Story = {
  render: () => (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>保存先を選ぶ</DialogTitle>
        </DialogHeader>
        <div className="h-[62dvh]" />
        <PoolSelect id="pool-in-a-dialog" />
      </DialogContent>
    </Dialog>
  ),
  play: async () => {
    const trigger = within(await screen.findByRole('dialog')).getByRole(
      'combobox',
      { name: '保存先プール' },
    )

    await expect(
      window.innerHeight - trigger.getBoundingClientRect().bottom,
    ).toBeLessThan(SELECT_LEAST_ROOM)

    await userEvent.click(trigger)

    const content = await opened()

    await expect(content).toHaveAttribute('data-side', 'bottom')
    await expect(
      Math.round(content.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(SELECT_LEAST_ROOM)
    await expect(window.scrollY).toBe(0)

    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(document.querySelector('[data-slot="select-content"]')).toBeNull(),
    )
  },
}
