import type { Meta, StoryObj } from '@storybook/nextjs'

import { CHANNEL_FIXTURES } from '@/repository/channels.fixtures'
import { LiveView } from '@/components/live/live-page'

const rows = CHANNEL_FIXTURES.filter((c) => !c.sub).map((c, i) => ({
  id: c.id,
  no: c.no,
  name: c.name,
  now: ['ニュースの視点9', 'クラシックの時間', '夜ふかしラジオ倶楽部'][i % 3],
  next: '次 22:00 土曜ドラマ「灯台のある町」',
  onAir: i === 0,
}))

const meta = {
  title: 'Screens/ライブ',
  component: LiveView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LiveView>

export default meta
type Story = StoryObj<typeof meta>

export const 通常: Story = {
  args: {
    live: {
      channelId: rows[0].id,
      channelNo: rows[0].no,
      channelName: rows[0].name,
      title: 'ニュースの視点9',
      timeLabel: '21:00 – 22:00',
      progressPct: 7,
      nowLabel: '21:04',
      restLabel: '残り 56 分',
      description:
        '政府がまとめた電力需給対策のポイントを担当記者が詳しく解説。乱高下する為替が家計と中小企業に与える影響を取材。',
      chips: ['字幕あり', 'ニュース/報道', '1080i', 'ステレオ(日本語)'],
      latencySec: 1.8,
      drops: 18,
      rows,
    },
  },
}
