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
import { Banner } from '@/components/vela/banner'
import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { Field, FieldHint, FieldLabel } from '@/components/vela/field'
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
import { AutoEncodeRow } from '@/page-component/settings/auto-encode-row'

const PROFILE_COLUMNS = [
  '名称',
  'コーデック',
  '解像度',
  '品質(CRF)',
  'インタレース解除',
  '成果物',
]

export function EncodeView({ result }: { result: EncodeResult }) {
  const { running, editing } = result

  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>エンコード</CrumbCurrent>
      </Crumb>
      <PageHeading description="録画を一度だけ変換して、再生のたびに払っている CPU を前払いにします。シークが即座になり、視聴が CPU を食わなくなります">
        エンコード
      </PageHeading>

      <Banner className="mt-3.5">
        <b>元 TS は削除されません。</b>
        削除は録画ごと、ライブラリからの明示操作でのみ行われます。エンコードの成果物は再生用の派生物で、作り直せます。
      </Banner>

      <section className="mt-5">
        <SectionHeading mark={MarkDots}>ジョブの現在地</SectionHeading>
        <p className="-mt-1.5 mb-3 text-note text-ink-2">
          いま何が走っているか、待機が何本か、直近で何が失敗したか
        </p>

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
              <Button variant="ghost" size="sm" disabled>
                中止
              </Button>
              <Button variant="ghost" size="sm" disabled>
                録画詳細を開く
              </Button>
              <span className="text-note text-ink-3">
                進捗が止まったままの状態は「実行中」と表示せず、停滞として検知します
              </span>
            </div>
          </Surface>
        )}

        <div className="mt-2.5 flex flex-wrap gap-2.5">
          <TintPanel tint="lavender" className="min-w-[160px] flex-1">
            <TintMetric label="待機" value={String(result.waiting)} unit="本" />
          </TintPanel>
          <TintPanel tint="salmon" className="min-w-[160px] flex-1">
            <TintMetric
              label="失敗"
              value={String(result.failed)}
              unit="本 · 分類は下の一覧"
            />
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
              <Button variant="outline" size="sm" disabled>
                再試行
              </Button>
            </Surface>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <SectionHeading mark={MarkPanel}>プロファイル</SectionHeading>
        <p className="-mt-1.5 mb-3 text-note text-ink-2">
          どう変換するかの定義。予約・ルールは ID でこれを参照します
        </p>
        <div className="mb-2.5">
          <Button size="sm" disabled>
            <PlusIcon />
            プロファイルを追加
          </Button>
        </div>
        <Table className="min-w-[720px]" containerClassName="pb-1">
          <TableHeader>
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
                  <span className="text-note text-ink-3">{profile.note}</span>
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
        <p className="-mt-1.5 mb-3 text-note text-ink-2">
          変更は保存後の新しいエンコードジョブから適用されます。実行中のジョブには影響しません
        </p>
        <Surface>
          <div className="grid gap-4 min-[760px]:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="profile-name">名称</FieldLabel>
              <Input id="profile-name" defaultValue={editing.name} readOnly />
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-resolution">解像度</FieldLabel>
              <Input
                id="profile-resolution"
                defaultValue={editing.resolution}
                readOnly
              />
              <FieldHint>
                放送波は 1440×1080 と 1920×1080 が混在します
              </FieldHint>
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-codec">コーデック</FieldLabel>
              <Input id="profile-codec" defaultValue={editing.codec} readOnly />
              <FieldHint>
                H.265 は同じ画質でファイルが小さくなりますが、
                <b>ブラウザによっては再生できません</b>
                。そのときは元 TS
                からのオンザフライ再生に落ちて、シークが数秒かかる状態に戻ります
              </FieldHint>
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-crf">品質(CRF)</FieldLabel>
              <Input
                id="profile-crf"
                className="font-code tabular-nums"
                defaultValue={editing.crf}
                readOnly
              />
              <div className="flex justify-between font-code text-note text-ink-3">
                <span>18 · 高品質</span>
                <span>38 · 高圧縮</span>
              </div>
              <FieldHint>
                小さいほど高品質・大容量。天秤にかけるのは容量ではなく、元 TS
                と見比べたときの画質です
              </FieldHint>
            </Field>
            <Field>
              <FieldLabel htmlFor="profile-deinterlace">
                インタレース解除
              </FieldLabel>
              <Input
                id="profile-deinterlace"
                defaultValue={editing.deinterlace}
                readOnly
              />
              <FieldHint>ソースがプログレッシブのときは何もしません</FieldHint>
            </Field>
            <Field>
              <FieldLabel>音声・字幕</FieldLabel>
              <p className="rounded-md bg-surface-2 px-3 py-2 text-ui text-ink-2">
                音声は無変換で全トラック · 字幕は多重化しない
              </p>
              <FieldHint>
                字幕は元 TS から作って別経路で送ります。成果物の尺は元 TS
                と一致させます
              </FieldHint>
            </Field>
          </div>
          <p className="mt-3 text-note text-ink-3">
            ffmpeg
            は引数配列でのみ起動します。オプションを自由に書き足す欄はこの画面に存在しません。
          </p>
          <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-dashed border-line pt-3">
            <span className="font-code text-note text-ink-3">
              {result.lastSavedAt}
            </span>
            <span className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" disabled>
                元に戻す
              </Button>
              <Button size="sm" disabled>
                保存
              </Button>
            </span>
          </div>
        </Surface>
      </section>

      <section className="mt-5">
        <SectionHeading mark={MarkSplit}>自動実行</SectionHeading>
        <p className="-mt-1.5 mb-3 text-note text-ink-2">
          録画の完了を検知して、エンコードジョブを登録します
        </p>
        <Surface className="space-y-3.5">
          <AutoEncodeRow label="録画終了後に自動エンコード">
            <span className="flex items-center gap-2.5">
              <Switch
                id="auto-encode"
                defaultChecked={result.autoEncode.enabled}
                disabled
              />
              <label htmlFor="auto-encode" className="text-ui">
                {result.autoEncode.enabled ? 'オン' : 'オフ'}
              </label>
            </span>
            <FieldHint>
              オフにすると、録画詳細から 1 件ずつ手で登録することになります
            </FieldHint>
          </AutoEncodeRow>
          <AutoEncodeRow label="対象">
            <p className="text-ui text-ink-2">{result.autoEncode.target}</p>
            <FieldHint>
              失敗した録画にはジョブを作りません。尻切れは対象にし、尻切れであることを画面で明示します
            </FieldHint>
          </AutoEncodeRow>
          <AutoEncodeRow label="使用コア数の上限">
            <p className="text-ui text-ink-2">{result.autoEncode.coreLimit}</p>
            <FieldHint>
              エンコードはライブ視聴に譲ります。視聴中は使用コアを抑えます
            </FieldHint>
          </AutoEncodeRow>
          <AutoEncodeRow label="同時実行">
            <p className="text-ui text-ink-2">
              <span className="font-code tabular-nums">
                {result.autoEncode.concurrency}
              </span>{' '}
              本(固定)
            </p>
            <FieldHint>
              到着間隔よりも短く終わるため、並べても待ち時間は縮みません
            </FieldHint>
          </AutoEncodeRow>
        </Surface>
      </section>
    </>
  )
}
