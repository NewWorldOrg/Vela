import type { DeviceKind } from '@/lib/device'
import { wordFor } from '@/lib/not-yet-in-this-build'
import { cn } from '@/lib/utils'
import type { AuthMethod } from '@/repository/auth'
import type { RevokeResult, SessionRow } from '@/repository/sessions'
import {
  Table,
  TableBody,
  TableColumns,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cardPlace } from '@/components/ui/table-cards'
import {
  DeviceDesktopIcon,
  DevicePhoneIcon,
  DevicePlayerIcon,
  DeviceTabletIcon,
  type IconProps,
} from '@/components/vela/icons'
import { ADMIN_LIST_HEIGHT_CAP } from '@/components/vela/app-shell'
import { ChipDot } from '@/components/vela/status'
import { RevokeSession } from '@/components/authentication/revoke-session'
import { SignOut } from '@/components/authentication/sign-out'
import { METHOD_LABEL } from '@/components/authentication/wording'
import { WHEN_LABELS } from '@/lib/when-terms'

const DEVICE_ICON: Record<
  DeviceKind,
  (props: IconProps) => React.ReactElement
> = {
  デスクトップ: DeviceDesktopIcon,
  タブレット: DeviceTabletIcon,
  スマートフォン: DevicePhoneIcon,
  外部プレイヤー: DevicePlayerIcon,
}

export function SessionTable({
  sessions,
  currentMethod,
  onRevoke,
}: {
  sessions: SessionRow[]
  currentMethod: AuthMethod
  onRevoke: (id: string) => Promise<RevokeResult>
}) {
  return (
    <Table
      cards
      className="table-fixed"
      containerClassName={cn(
        ADMIN_LIST_HEIGHT_CAP,
        'overflow-y-auto pb-1 [&>table]:min-w-[calc(800rem/16)]',
      )}
    >
      <TableColumns
        widths={[
          'calc(228rem/16)',
          'calc(220rem/16)',
          'calc(164rem/16)',
          'calc(164rem/16)',
          'calc(140rem/16)',
        ]}
      />
      <TableHeader className="[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10">
        <TableRow>
          <TableHead>端末</TableHead>
          <TableHead>アカウント</TableHead>
          <TableHead>作成</TableHead>
          <TableHead>{WHEN_LABELS.taken}</TableHead>
          <TableHead>
            <span className="sr-only">操作</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((session) => (
          <TableRow key={session.id}>
            <TableCell {...cardPlace('lead')}>
              <DeviceName session={session} />
            </TableCell>
            <TableCell {...cardPlace('meta')}>
              <Account session={session} />
            </TableCell>
            <TableCell
              {...cardPlace('field', '作成')}
              className="font-code text-sub tabular-nums"
            >
              {session.createdAt}
            </TableCell>
            <TableCell
              {...cardPlace('field', WHEN_LABELS.taken)}
              className="font-code text-sub tabular-nums"
            >
              {session.lastUsedAt}
            </TableCell>
            <TableCell {...cardPlace('actions')} className="text-right">
              {session.current ? (
                <SignOut method={currentMethod} />
              ) : (
                <RevokeSession session={session} onRevoke={onRevoke} />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function DeviceName({ session }: { session: SessionRow }) {
  const Glyph = session.device.kind
    ? DEVICE_ICON[session.device.kind]
    : DeviceDesktopIcon

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[calc(8rem/16)] bg-surface-2 text-ink-2">
        <Glyph className="size-[calc(17rem/16)]" />
      </span>
      <span className="min-w-0">
        <b className="block truncate text-ui font-semibold text-ink">
          {session.device.name}
        </b>
        <span className="flex items-center gap-2 text-cap text-ink-2">
          {session.device.kind}
          {session.current && (
            <span className="inline-flex items-center gap-1 font-semibold whitespace-nowrap text-acc-text">
              <ChipDot className="bg-accent" />
              いまの端末
            </span>
          )}
        </span>
      </span>
    </div>
  )
}

function Account({ session }: { session: SessionRow }) {
  return (
    <span className="block min-w-[calc(160rem/16)] whitespace-normal wrap-anywhere">
      <b className="block text-ui font-semibold">{session.displayName}</b>
      <small className="block text-cap text-ink-2">
        {wordFor(METHOD_LABEL, session.method)}
      </small>
    </span>
  )
}
