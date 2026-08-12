import type { Meta, StoryObj } from '@storybook/nextjs'

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { StatusText } from '@/components/vela/status'
import { SectionHeading } from '@/components/vela/section-heading'
import { EmptyState } from '@/components/vela/empty-state'
import { Button } from '@/components/ui/button'
import { ListIcon, MarkStar } from '@/components/vela/icons'

const meta = {
  title: 'Components/Table',
  component: Table,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

const ROWS = [
  {
    service: 'みなと総合1',
    id: '011',
    ch: '27ch',
    kind: 'TV',
    cnr: '31.2 dB',
    tone: 'ok' as const,
    state: '良好',
  },
  {
    service: 'みなと教育1',
    id: '021',
    ch: '26ch',
    kind: 'TV',
    cnr: '30.4 dB',
    tone: 'ok' as const,
    state: '良好',
  },
  {
    service: 'シティ MX1',
    id: '091',
    ch: '—',
    kind: 'TV',
    cnr: '—',
    tone: 'warn' as const,
    state: '要対応',
  },
  {
    service: 'シティ MX2',
    id: '092',
    ch: '—',
    kind: 'ワンセグ',
    cnr: '—',
    tone: 'off' as const,
    state: '無効',
  },
]

export const Default: Story = {
  render: () => (
    <div className="mx-auto max-w-[760px] p-6">
      <SectionHeading mark={ListIcon}>チャンネル一覧</SectionHeading>
      <Table>
        <TableCaption>直近のチャンネルスキャンの結果</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>サービス</TableHead>
            <TableHead>サービスID</TableHead>
            <TableHead>物理ch</TableHead>
            <TableHead>区分</TableHead>
            <TableHead className="text-right">CNR</TableHead>
            <TableHead>状態</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROWS.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.service}</TableCell>
              <TableCell className="font-code tabular-nums text-ink-2">
                {row.id}
              </TableCell>
              <TableCell className="font-code tabular-nums text-ink-2">
                {row.ch}
              </TableCell>
              <TableCell>
                <Badge variant={row.kind === 'TV' ? 'kindTv' : 'kindSegment'}>
                  {row.kind}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-code tabular-nums">
                {row.cnr}
              </TableCell>
              <TableCell>
                <StatusText tone={row.tone}>{row.state}</StatusText>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={5}>合計</TableCell>
            <TableCell className="font-code tabular-nums">4 件</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
      <p className="mt-[9px] text-note text-ink-3">
        ヘッダ行は surface-2
        の帯で、外枠は付けない。行間は破線、ホバーは面の色だけ。
      </p>
    </div>
  ),
}

export const Empty: Story = {
  render: () => (
    <div className="mx-auto max-w-[760px] p-6">
      <SectionHeading mark={MarkStar}>空状態</SectionHeading>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>サービス</TableHead>
            <TableHead>物理ch</TableHead>
            <TableHead>状態</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody />
      </Table>
      <EmptyState
        spot="antenna"
        className="mt-2.5"
        action={<Button>スキャンを実行</Button>}
      >
        データがありません
      </EmptyState>
    </div>
  ),
}
