import type { Recording } from '@/repository/recordings'
import { Button } from '@/components/ui/button'
import { PlayIcon, TrashIcon } from '@/components/vela/icons'

export function RecordingActions({ recording }: { recording: Recording }) {
  const deletable = recording.outcome !== 'recording'

  return (
    <>
      <div className="flex flex-wrap items-center gap-[9px]">
        <Button disabled title="再生はこれから実装されます">
          <PlayIcon />
          再生
        </Button>
        <Button
          variant="outline"
          disabled
          title="エンコードはこれから実装されます"
        >
          エンコード
        </Button>
        <Button
          variant="destructive"
          className="ml-auto"
          disabled
          title={
            deletable ? '削除はこれから実装されます' : '録画中は削除できません'
          }
        >
          <TrashIcon />
          削除
        </Button>
      </div>
      <p className="mt-[9px] text-note leading-relaxed text-ink-3">
        プロファイルは1つのため、「エンコード」を押すと選択させずそのまま待機列へ登録します。元
        TS
        は削除されません。削除は録画ごと、ライブラリからの明示操作でのみ行われます。
      </p>
    </>
  )
}
