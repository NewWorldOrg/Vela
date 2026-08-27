import type { Meta, StoryObj } from '@storybook/nextjs'

import type { SweepWrite } from '@/repository/integrity'
import {
  INTEGRITY_CLEAR_FIXTURE,
  INTEGRITY_FIXTURE,
} from '@/stories/fixtures/integrity'
import { IntegrityView } from '@/components/integrity/integrity-page'

const swept = async (): Promise<SweepWrite> => ({ state: 'ok', findings: 5 })

const meta = {
  title: 'Screens/整合性チェック',
  component: IntegrityView,
  parameters: { layout: 'fullscreen' },
  args: { onRun: swept },
} satisfies Meta<typeof IntegrityView>

export default meta
type Story = StoryObj<typeof meta>

export const 食い違いあり: Story = { args: { result: INTEGRITY_FIXTURE } }

export const 食い違いなし: Story = { args: { result: INTEGRITY_CLEAR_FIXTURE } }

export const 保存先を読めない: Story = {
  args: {
    result: {
      ...INTEGRITY_FIXTURE,
      roots: [],
      storageProblem:
        '保存先の空き容量を読めませんでした。見つかったものの一覧は下のとおりです。',
    },
  },
}

export const 届かないルートがある: Story = {
  args: {
    result: {
      ...INTEGRITY_FIXTURE,
      check: {
        ...INTEGRITY_FIXTURE.check!,
        rootsOutOfReach: 1,
        ledgerRowsInRootsOutOfReach: 8,
      },
    },
  },
}
