import { cn } from '@/lib/utils'
import type { EncodeResult } from '@/repository/encode'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ADMIN_LIST_HEIGHT_CAP,
  Crumb,
  CrumbCurrent,
} from '@/components/vela/app-shell'
import { Field, FieldLabel } from '@/components/vela/field'
import {
  MarkDots,
  MarkPanel,
  MarkRuler,
  MarkSplit,
  PlusIcon,
  SignalIcon,
} from '@/components/vela/icons'
import { PageHeading, SectionHeading } from '@/components/vela/section-heading'
import { ProgressBar } from '@/components/vela/progress'
import { Surface, TintMetric, TintPanel } from '@/components/vela/surface'
import { AutoEncodeRow } from '@/components/encode/auto-encode-row'

const PROFILE_COLUMNS = [
  '名称',
  'コーデック',
  '解像度',
  '品質(CRF)',
  'インタレース解除',
  '成果物',
]

/*
 * Nothing on this screen can be pressed yet: the encode domain has no wire
 * behind it, and what is drawn is a shape with sample values in it. A control
 * that will one day answer is kept and told why it cannot answer now — the
 * other kind of disabled, a state that will never accept the action, is drawn
 * by leaving the control out.
 */
const CANCEL_NOT_WIRED = 'ジョブの中止はこれから実装されます'
const OPEN_RECORDING_NOT_WIRED = '録画詳細への移動はこれから実装されます'
const RETRY_NOT_WIRED = '失敗したジョブの再試行はこれから実装されます'
const ADD_PROFILE_NOT_WIRED = 'プロファイルの追加はこれから実装されます'
const EDIT_PROFILE_NOT_WIRED = 'プロファイルの編集はこれから実装されます'
const AUTO_ENCODE_NOT_WIRED = '自動エンコードの切り替えはこれから実装されます'

/** What the switch in the 自動実行 panel is for, rather than what it says. */
const AUTO_ENCODE_LABEL_ID = 'auto-encode-label'

export function EncodeView({ result }: { result: EncodeResult }) {
  const { running, editing } = result

  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>エンコード</CrumbCurrent>
      </Crumb>
      <PageHeading>エンコード</PageHeading>

      <section className="mt-5">
        <SectionHeading mark={MarkDots}>ジョブの現在地</SectionHeading>

        {running && (
          <Surface>
            <div className="flex items-center gap-2.5">
              <SignalIcon className="size-[17px] text-brand" />
              <b className="min-w-0 flex-1 truncate text-ui font-bold">
                {running.title}
              </b>
              <span className="font-code text-ui font-medium tabular-nums text-brand">
                {running.progressPct}%
              </span>
            </div>
            <ProgressBar
              value={running.progressPct}
              label="エンコードの進捗"
              className="mt-2.5 h-1.5"
            />
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 font-code text-note tabular-nums text-ink-3">
              <span>{running.recordedAt}</span>
              <span>{running.elapsed}</span>
              <span>{running.remaining}</span>
              <span>{running.cores}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled
                title={CANCEL_NOT_WIRED}
              >
                中止
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled
                title={OPEN_RECORDING_NOT_WIRED}
              >
                録画詳細を開く
              </Button>
            </div>
          </Surface>
        )}

        <div className="mt-2.5 flex flex-wrap gap-2.5">
          <TintPanel tint="lavender" className="min-w-[160px] flex-1">
            <TintMetric label="待機" value={String(result.waiting)} unit="本" />
          </TintPanel>
          <TintPanel tint="salmon" className="min-w-[160px] flex-1">
            <TintMetric label="失敗" value={String(result.failed)} unit="本" />
          </TintPanel>
          <TintPanel tint="butter" className="min-w-[160px] flex-1">
            <TintMetric
              label="所要の実績"
              value={result.averageMinutes}
              unit={result.averageNote}
            />
          </TintPanel>
          <TintPanel tint="sage" className="min-w-[160px] flex-1">
            <TintMetric
              label="同時実行"
              value={result.concurrency}
              unit={result.concurrencyNote}
            />
          </TintPanel>
        </div>

        <div className="mt-2.5 space-y-2">
          {result.failures.map((failure) => (
            <Surface
              key={failure.id}
              className="flex flex-wrap items-start gap-3"
            >
              <div className="min-w-0 flex-1">
                <b className="text-ui font-bold">{failure.title}</b>
                <p className="mt-0.5 text-sub text-ink-2">{failure.body}</p>
                <span className="mt-1.5 inline-block font-code text-note text-ink-3">
                  {failure.classification}
                </span>
              </div>
              <Badge
                variant={failure.tone === 'err' ? 'err' : 'warn'}
                className="mt-px"
              >
                失敗
              </Badge>
              <Button
                variant="outline"
                size="sm"
                disabled
                title={RETRY_NOT_WIRED}
              >
                再試行
              </Button>
            </Surface>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <SectionHeading mark={MarkPanel}>プロファイル</SectionHeading>
        <div className="mb-2.5">
          <Button size="sm" disabled title={ADD_PROFILE_NOT_WIRED}>
            <PlusIcon />
            プロファイルを追加
          </Button>
        </div>
        <Table
          className="min-w-[720px]"
          containerClassName={cn(ADMIN_LIST_HEIGHT_CAP, 'overflow-y-auto pb-1')}
        >
          <TableHeader className="[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10">
            <TableRow>
              {PROFILE_COLUMNS.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.profiles.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell>
                  <b className="block text-[13px] font-bold">{profile.name}</b>
                </TableCell>
                <TableCell className="font-code">{profile.codec}</TableCell>
                <TableCell>{profile.resolution}</TableCell>
                <TableCell className="font-code tabular-nums">
                  {profile.crf}
                </TableCell>
                <TableCell>{profile.deinterlace}</TableCell>
                <TableCell className="font-code">{profile.output}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="mt-5">
        <SectionHeading mark={MarkRuler}>
          プロファイルの編集 — {editing.name}
        </SectionHeading>
        <Surface>
          <div className="grid gap-4 min-[760px]:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="profile-name">名称</FieldLabel>
              <Input
                id="profile-name"
                defaultValue={editing.name}
                disabled
                title={EDIT_PROFILE_NOT_WIRED}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-resolution">解像度</FieldLabel>
              <Input
                id="profile-resolution"
                defaultValue={editing.resolution}
                disabled
                title={EDIT_PROFILE_NOT_WIRED}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-codec">コーデック</FieldLabel>
              <Input
                id="profile-codec"
                defaultValue={editing.codec}
                disabled
                title={EDIT_PROFILE_NOT_WIRED}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-crf">品質(CRF)</FieldLabel>
              <Input
                id="profile-crf"
                className="font-code tabular-nums"
                defaultValue={editing.crf}
                disabled
                title={EDIT_PROFILE_NOT_WIRED}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-deinterlace">
                インタレース解除
              </FieldLabel>
              <Input
                id="profile-deinterlace"
                defaultValue={editing.deinterlace}
                disabled
                title={EDIT_PROFILE_NOT_WIRED}
              />
            </Field>
            <Field>
              <FieldLabel>音声・字幕</FieldLabel>
              <p className="rounded-md bg-surface-2 px-3 py-2 text-ui text-ink-2">
                音声は無変換で全トラック · 字幕は多重化しない
              </p>
            </Field>
          </div>
          <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-dashed border-line pt-3">
            <span className="font-code text-note text-ink-3">
              {result.lastSavedAt}
            </span>
            <span className="ml-auto flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled
                title={EDIT_PROFILE_NOT_WIRED}
              >
                元に戻す
              </Button>
              <Button size="sm" disabled title={EDIT_PROFILE_NOT_WIRED}>
                保存
              </Button>
            </span>
          </div>
        </Surface>
      </section>

      <section className="mt-5">
        <SectionHeading mark={MarkSplit}>自動実行</SectionHeading>
        <Surface className="space-y-3.5">
          <AutoEncodeRow
            label="録画終了後に自動エンコード"
            labelId={AUTO_ENCODE_LABEL_ID}
          >
            <span className="flex items-center gap-2.5">
              <Switch
                id="auto-encode"
                aria-labelledby={AUTO_ENCODE_LABEL_ID}
                defaultChecked={result.autoEncode.enabled}
                disabled
                title={AUTO_ENCODE_NOT_WIRED}
              />
              <span className="text-ui">
                {result.autoEncode.enabled ? 'オン' : 'オフ'}
              </span>
            </span>
          </AutoEncodeRow>
          <AutoEncodeRow label="対象">
            <p className="text-ui text-ink-2">{result.autoEncode.target}</p>
          </AutoEncodeRow>
          <AutoEncodeRow label="使用コア数の上限">
            <p className="text-ui text-ink-2">{result.autoEncode.coreLimit}</p>
          </AutoEncodeRow>
          <AutoEncodeRow label="同時実行">
            <p className="text-ui text-ink-2">
              <span className="font-code tabular-nums">
                {result.autoEncode.concurrency}
              </span>{' '}
              本(固定)
            </p>
          </AutoEncodeRow>
        </Surface>
      </section>
    </>
  )
}
