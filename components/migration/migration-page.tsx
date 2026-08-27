import type { MigrationResult } from '@/repository/migration'
import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { EmptyState } from '@/components/vela/empty-state'
import { PageHeading } from '@/components/vela/section-heading'
import { MigrationReport } from '@/components/migration/migration-report'

export function MigrationView({ result }: { result: MigrationResult | null }) {
  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>移行記録</CrumbCurrent>
      </Crumb>
      <PageHeading description="移行で何が運ばれ、何が運ばれなかったかを、いつでも言えるようにするための記録です。処理は一度限りですが、記録は恒久に残ります。">
        移行記録
      </PageHeading>

      {result === null ? (
        <EmptyState
          spot="tape"
          title="移行の記録がありません"
          titleLevel={2}
          className="mt-3.5 [word-break:auto-phrase]"
        >
          移行はまだ一度も実行されていません。実行するとここに記録が残り、管理メニューにも「移行記録」が現れます。
        </EmptyState>
      ) : (
        <MigrationReport result={result} />
      )}
    </>
  )
}
