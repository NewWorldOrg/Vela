import type { Meta, StoryObj } from '@storybook/nextjs'

import { Button } from '@/components/ui/button'
import { Surface } from '@/components/vela/surface'

const meta = {
  title: 'Foundations/Elevation',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const SurfacesAndShadows: Story = {
  render: () => (
    <div className="mx-auto grid max-w-[760px] gap-6 px-10 py-8">
      <Surface>
        <h2 className="heading text-heading">面</h2>
        <p className="mt-1 text-body text-ink-2">
          まとまりは面の濃淡で分け、枠も影も付けない。
        </p>
      </Surface>
      <div className="flex flex-wrap items-center gap-3">
        <Button>予約を追加</Button>
        <Button variant="tone">外部プレイヤーで再生</Button>
        <Button variant="ghost">チューナーへ</Button>
      </div>
      <div className="w-fit rounded-lg bg-raised p-4 shadow-lift">
        <p className="text-body">浮くものだけが影を持つ。</p>
      </div>
    </div>
  ),
}
