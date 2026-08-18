import { formatInstant } from '@/lib/format'
import type {
  ApiHealthResult,
  DriverConnection,
  DriverStatus,
  DriverStatusResult,
  SystemStatus,
} from '@/repository/system'
import { Badge } from '@/components/ui/badge'
import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { Banner, InlineAlert } from '@/components/vela/banner'
import { EmptyState } from '@/components/vela/empty-state'
import { MarkDoubleCircle, MarkSplit } from '@/components/vela/icons'
import { PageHeading, SectionHeading } from '@/components/vela/section-heading'
import { ChipDot, StatusText } from '@/components/vela/status'
import { Surface } from '@/components/vela/surface'

const API_TROUBLE: Record<
  Exclude<ApiHealthResult['state'], 'ok'>,
  { title: string; body: string }
> = {
  unconfigured: {
    title: 'API の接続先が設定されていません',
    body: '環境変数 CARINA_API_BASE_URL に API の URL を設定してください。',
  },
  unreachable: {
    title: 'API に接続できません',
    body: 'API が起動しているか、接続先の URL が正しいかを確認してください。',
  },
  failed: {
    title: 'API が想定した応答を返しませんでした',
    body: '接続はできています。API 側のログを確認してください。',
  },
}

const CONNECTION: Record<
  DriverConnection,
  { label: string; variant: 'ok' | 'warn' | 'err' }
> = {
  connected: { label: '接続中', variant: 'ok' },
  notConnected: { label: '未接続', variant: 'err' },
  draining: { label: '停止準備中', variant: 'warn' },
}

export function SystemView({ status }: { status: SystemStatus }) {
  const { api, driver } = status
  const trouble = api.state === 'ok' ? null : API_TROUBLE[api.state]

  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>システム</CrumbCurrent>
      </Crumb>
      <PageHeading description="アプリと driver の接続状態">
        システム
      </PageHeading>

      {trouble && (
        <Banner tone="danger" className="mt-3.5">
          <b className="block">{trouble.title}</b>
          {trouble.body}
          {api.state === 'failed' && (
            <span className="ml-1 font-code">HTTP {api.httpStatus}</span>
          )}
        </Banner>
      )}

      <section className="mt-4">
        <SectionHeading mark={MarkDoubleCircle}>API</SectionHeading>
        <Surface className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {api.state === 'ok' ? (
            <>
              <StatusText tone="ok">応答しています</StatusText>
              <span className="text-ui text-ink-2">
                ヘルスの応答{' '}
                <b className="font-code font-medium text-ink">{api.status}</b>
              </span>
            </>
          ) : (
            <StatusText tone="err">応答がありません</StatusText>
          )}
        </Surface>
      </section>

      <section className="mt-4">
        <SectionHeading mark={MarkSplit}>driver</SectionHeading>
        <DriverSection result={driver} />
      </section>
    </>
  )
}

function DriverSection({ result }: { result: DriverStatusResult }) {
  if (result.state === 'ok') {
    return <DriverFacts status={result.status} />
  }

  if (result.state === 'unauthenticated') {
    return (
      <EmptyState spot="tuner" title="サインインしないと見られません">
        driver
        の状態はサインインしたユーザーだけに見せています。サインインはこれから実装されます。
      </EmptyState>
    )
  }

  if (result.state === 'unavailable') {
    return (
      <EmptyState spot="tuner" title="状態を取得できませんでした">
        API は driver の状態を答えられませんでした。{result.message}
      </EmptyState>
    )
  }

  return (
    <EmptyState spot="tuner" title="状態が分かりません">
      API に接続できないため、driver が動いているかどうかも分かりません。
    </EmptyState>
  )
}

function DriverFacts({ status }: { status: DriverStatus }) {
  const connection = CONNECTION[status.connection]
  const { hello } = status

  return (
    <Surface>
      <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-5 gap-y-2.5 text-ui">
        <dt className="text-ink-3">接続状態</dt>
        <dd>
          <Badge variant={connection.variant} className="font-bold">
            <ChipDot />
            {connection.label}
          </Badge>
        </dd>
        <dt className="text-ink-3">インスタンス</dt>
        <dd className="font-code text-ink-2">
          {hello?.instanceId ?? <span className="text-ink-3">—</span>}
        </dd>
        <dt className="text-ink-3">driver の機能</dt>
        <dd className="flex flex-wrap gap-1.5">
          {hello && hello.capabilities.length > 0 ? (
            hello.capabilities.map((capability) => (
              <Badge key={capability}>{capability}</Badge>
            ))
          ) : (
            <span className="text-ink-3">—</span>
          )}
        </dd>
        <dt className="text-ink-3">不足している機能</dt>
        <dd className="flex flex-wrap gap-1.5">
          {status.missingCapabilities.length > 0 ? (
            status.missingCapabilities.map((capability) => (
              <Badge key={capability} variant="err" className="font-bold">
                {capability}
              </Badge>
            ))
          ) : (
            <span className="text-ink-2">なし</span>
          )}
        </dd>
        <dt className="text-ink-3">プロトコル版数</dt>
        <dd className="font-code text-ink-2">
          driver {hello?.protocolVersion ?? '—'} / アプリ{' '}
          {status.appProtocolVersion}
        </dd>
        <dt className="text-ink-3">観測時刻</dt>
        <dd className="font-code text-ink-2">
          {formatInstant(status.observedAt)}
        </dd>
      </dl>
      {status.driverUpdateRequired && (
        <InlineAlert tone="warn" className="mt-3.5">
          driver の更新が必要です。アプリが使う機能の一部をこの driver
          は持っていません。
        </InlineAlert>
      )}
    </Surface>
  )
}
