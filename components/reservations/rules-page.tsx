import Link from 'next/link'

import type { Rule } from '@/repository/reservations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Banner } from '@/components/vela/banner'
import { PlusIcon, SearchIcon } from '@/components/vela/icons'
import { ReservationTabs } from '@/components/reservations/reservation-tabs'

export function RulesView({ rules }: { rules: Rule[] }) {
  return (
    <main className="flex-1 px-3.5 pt-6 pb-16 min-[701px]:px-5 min-[1061px]:px-[30px]">
      <ReservationTabs
        current="rules"
        action={
          <Button size="sm" asChild>
            <Link href="/search">
              <SearchIcon />
              検索から作る
            </Link>
          </Button>
        }
      />

      <Banner tone="info" className="mb-3.5">
        ルールは番組検索と同じ条件で書きます。保存する前にマッチする番組を確認できます。
      </Banner>

      <div className="space-y-2.5">
        {rules.map((r) => (
          <section key={r.id} className="rounded-lg bg-surface px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="heading min-w-0 flex-1 text-[15px]">{r.name}</h2>
              {r.enabled ? (
                <Badge variant="ok" className="font-bold">
                  有効
                </Badge>
              ) : (
                <Badge variant="mute">無効</Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled
                title="ルールの編集はこれから実装されます"
              >
                編集
              </Button>
            </div>
            <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-ui">
              <dt className="text-ink-3">キーワード</dt>
              <dd className="text-ink-2">{r.keywords}</dd>
              {r.excludes && (
                <>
                  <dt className="text-ink-3">除外キーワード</dt>
                  <dd className="text-ink-2">{r.excludes}</dd>
                </>
              )}
              <dt className="text-ink-3">対象フィールド</dt>
              <dd className="text-ink-2">{r.target}</dd>
              <dt className="text-ink-3">ジャンル</dt>
              <dd className="text-ink-2">{r.genres.join(' / ')}</dd>
              <dt className="text-ink-3">チャンネル</dt>
              <dd className="text-ink-2">{r.channels}</dd>
            </dl>
            <p className="mt-2.5 text-note text-ink-3">
              いまの番組表で{' '}
              <b className="font-code font-medium text-ink-2">{r.matchCount}</b>{' '}
              件にマッチします
            </p>
          </section>
        ))}
      </div>

      <div className="mt-3.5 flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          disabled
          title="ルールの追加はこれから実装されます"
        >
          <PlusIcon />
          ルールを追加
        </Button>
      </div>
    </main>
  )
}
