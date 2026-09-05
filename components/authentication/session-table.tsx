import type { DeviceKind } from '@/lib/device'
import { cn } from '@/lib/utils'
import type { AuthMethod } from '@/repository/auth'
import type { RevokeResult, SessionRow } from '@/repository/sessions'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { METHOD_LABEL, METHOD_NOTE } from '@/components/authentication/wording'

const DEVICE_ICON: Record<
  DeviceKind,
  (props: IconProps) => React.ReactElement
> = {
  デスクトップ: DeviceDesktopIcon,
  タブレット: DeviceTabletIcon,
  スマートフォン: DevicePhoneIcon,
  外部プレイヤー: DevicePlayerIcon,
}

const CURRENT_ROW =
  'hover:bg-transparent [&>td]:border-transparent [&>td]:bg-brand-soft [&>td:first-child]:rounded-l-md [&>td:last-child]:rounded-r-md'

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
      containerClassName={cn(
        ADMIN_LIST_HEIGHT_CAP,
        'overflow-y-auto pb-1 [&>table]:min-w-[720px]',
      )}
    >
      <TableHeader className="[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10">
        <TableRow>
          <TableHead>端末</TableHead>
          <TableHead>認証方式</TableHead>
          <TableHead>作成</TableHead>
          <TableHead>最終利用</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((session) => (
          <TableRow
            key={session.id}
            className={session.current ? CURRENT_ROW : undefined}
          >
            <TableCell>
              <DeviceName session={session} />
            </TableCell>
            <TableCell>
              <Method method={session.method} />
            </TableCell>
            <TableCell className="font-code text-sub tabular-nums">
              {session.createdAt}
            </TableCell>
            <TableCell>
              <span className="font-code text-sub tabular-nums">
                {session.lastUsed.label}
              </span>
              {session.lastUsed.at && (
                <small className="block font-sans text-cap text-ink-3">
                  {session.lastUsed.at}
                </small>
              )}
            </TableCell>
            <TableCell className="text-right">
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
    <div className="flex min-w-0 items-center gap-[11px]">
      <span
        className={
          session.current
            ? 'flex size-8 shrink-0 items-center justify-center rounded-md bg-surface text-brand'
            : 'flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-ink-3'
        }
      >
        <Glyph className="size-[17px]" />
      </span>
      <span className="min-w-0">
        <b
          className={
            session.current
              ? 'heading block text-ui text-brand'
              : 'heading block text-ui'
          }
        >
          {session.device.name}
        </b>
        {session.device.kind && (
          <span className="block text-cap text-ink-3">
            {session.device.kind}
          </span>
        )}
      </span>
      {session.current && (
        <Badge variant="info" className="bg-surface font-bold">
          <ChipDot />
          いまの端末
        </Badge>
      )}
    </div>
  )
}

function Method({ method }: { method: AuthMethod }) {
  const note = METHOD_NOTE[method]

  return (
    <span className="text-sub">
      {METHOD_LABEL[method]}
      {note && <small className="block text-cap text-ink-3">{note}</small>}
    </span>
  )
}
